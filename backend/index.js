const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const fileUpload = require("express-fileupload"); // Import express-fileupload module
const jwt = require("jsonwebtoken");

app.use(express.json());
app.use(cors());

// Database connection with MongoDB
mongoose
  .connect(
    "mongodb+srv://niravmangukiya88:Nirav%402024@cluster0.vaf1rkr.mongodb.net/e-commerce"
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

// Use express-fileupload middleware
app.use(fileUpload());

// API creation
app.get("/", (req, res) => {
  res.send("Express app is running");
});

app.use("/images", express.static("upload/images"));
// Creating upload Endpoint for images
app.post("/upload", (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ message: "No files were uploaded." });
  }

  const productImage = req.files.product;

  // Move the uploaded file to the designated folder
  productImage.mv(`./upload/images/${productImage.name}`, (error) => {
    if (error) {
      return res.status(500).json({ message: "Error uploading file." });
    }

    res.json({
      success: 1,
      image_url: `http://localhost:${port}/images/${productImage.name}`,
    });
  });
});

// Schema for Creating Products

const Product = mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
});

app.post("/addproduct", async (req, res) => {
  let products = await Product.find({});
  let id;
  if (products.length > 0) {
    let last_product_array = products.slice(-1);
    let last_product = last_product_array[0];
    id = last_product.id + 1;
  } else {
    id = 1;
  }

  const product = new Product({
    id: id,
    name: req.body.name,
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price,
  });
  console.log(product);
  await product.save();
  console.log("Product added successfully");
  res.json({
    success: true,
    name: req.body.name,
  });
});

// Creating API For deleting Products

app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log("Delete Successfully");
  res.json({
    success: true,
    name: req.body.id,
  });
});

// Creating API for getting all products
app.get("/allproducts", async (req, res) => {
  let products = await Product.find({});
  console.log("all products fetched");
  res.send(products);
});

// shema creating for user model
const User = mongoose.model("Users", {
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  cartData: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

// Creating Endpoint for registering the user
app.post("/signup", async (req, res) => {
  let check = await User.findOne({ email: req.body.email });
  if (check) {
    return res.status(400).json({
      success: false,
      errors: "existing user found with the same email address",
    });
  }

  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }

  const user = new User({
    name: req.body.username,
    email: req.body.email,
    password: req.body.password,
    cartData: cart,
  });

  await user.save();

  const data = {
    user: {
      id: user.id,
    },
  };

  const token = jwt.sign(data, "secret_ecom");
  res.json({ success: true, token: token });
});

// Creating endpoint for user login
app.post("/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user) {
    const passCompare = req.body.password === user.password;

    if (passCompare) {
      const data = {
        user: {
          id: user.id,
        },
      };
      const token = jwt.sign(data, "secret_ecom");
      res.json({ success: true, token });
    } else {
      res.json({ success: false, errors: "Wrong Password" });
    }
  } else {
    res.json({ success: false, errors: "Wrong Email Id" });
  }
});

//creating endpoint for newcollection data
app.get("/newcollections", async (req, res) => {
  let products = await Product.find({});
  let newcollections = products.slice(1).slice(-8);
  console.log("New Collection fetched");
  res.send(newcollections);
});

// creating endpoint for popular in women
app.get("/popularinwomen", async (req, res) => {
  let products = await Product.find({ category: "women" });
  let popular_in_women = products.slice(0, 4);
  console.log("popular in women fetched");
  res.send(popular_in_women);
});

// creating middelware to fetch user
const fetchUser = async (req, res, next) => {
  const token = req.header("auth-token");
  console.log(token);
  if (!token) {
    res.status(401).send({ errors: "Please authenticate using valide token" });
  } else {
    try {
      const data = jwt.verify(token, "secret_ecom");
      console.log("dddds", data);
      req.user = data.user;
      next();
    } catch (error) {
      res.status(401).send({ errors: "Please authenticate using valid token" });
    }
  }
};

// creating endpoint for adding products in cartdata
app.post("/addtocart", fetchUser, async (req, res) => {
  console.log("Added", req.body.itemId);

  let userData = await User.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemId] += 1;
  await User.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Added");
});

// creating endpoint to remove cart data
app.post("/removefromcart", fetchUser, async (req, res) => {
  console.log("removed", req.body.itemId);
  let userData = await User.findOne({ _id: req.user.id });

  if (userData.cartData[req.body.itemId] > 0)
    userData.cartData[req.body.itemId] -= 1;
  await User.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Added");
});

// creating endpoint to get cart data
app.post("/getcart", fetchUser, async (req, res) => {
  console.log("user", req.user);
  try {
    let userData = await User.findOne({ _id: req.user.id });
    res.json(userData.cartData);
  } catch (error) {
    console.log(error);
  }
});

app.listen(port, (error) => {
  if (!error) {
    console.log("Server is running on Port " + port);
  } else {
    ``;
    console.error("Error:", error);
  }
});
