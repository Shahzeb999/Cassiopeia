const { Router } = require('express');
const User = require('../models/user');
const { createHmac, randomBytes } = require("crypto");
const { createTokenForUser } = require('../services/authentication');
const multer = require('multer');
const path = require('path');
const aws = require('aws-sdk');

const router = Router();

// AWS S3 setup
const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'ap-south-1' // Replace with your AWS region
});

const bucketName = 'shahzeb-blogify'; // Replace with your S3 bucket name

const upload = multer({
  storage: multer.memoryStorage(), // Store the file in memory before uploading to S3
  limits: {
    fileSize: 10 * 1024 * 1024 // Limit file size to 10MB (adjust as needed)
  }
});

router.get('/signin', (req, res) => {
  return res.render("signin");
});

router.get("/signup", (req, res) => {
  return res.render("signup");
});

router.post("/signin", (req, res) => {
  const { email, password } = req.body;

  User.matchPasswordAndGenerateToken(email, password)
    .then(token => {
      console.log('token', token);
      return res.cookie("token", token).redirect("/");
    })
    .catch(error => {
      console.error('Error:', error.message);
      return res.render("signin", {
        error: "Incorrect Email or password"
      });
    });
});

router.post('/signup', async (req, res) => {
  const { fullName, email, password } = req.body;

  console.log(req.body);

  await User.create({
    fullName,
    email,
    password
  });

  return res.redirect("/");
});

router.get('/profile', (req, res) => {
  return res.render("profile", {
    user: req.user,
  });
});

router.get('/edit-profile', (req, res) => {
  return res.render("edit-profile", {
    user: req.user,
  });
});

router.post('/edit-profile', upload.single("profileImage"), async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!req.user) {
    return res.redirect('/user/signin');
  }

  try {
    let updateData = {
      fullName,
      email,
    };

    if (req.file) {
      // Upload image to Amazon S3
      const imageFile = req.file;
      const fileName = `${Date.now()}-${imageFile.originalname}`;

      const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: imageFile.buffer,
        ContentType: imageFile.mimetype
      };

      s3.upload(params, async (err, data) => {
        if (err) {
          console.error('Error uploading to S3:', err);
          throw new Error('Failed to upload image');
        }

        updateData.profileImageURL = data.Location;

        // Update user with the new profile image URL
        const updatedUser = await User.findByIdAndUpdate(req.user._id, updateData, { new: true });

        res.redirect('/user/profile');
      });
    } else {
      // No new image uploaded, update user without changing the profile image URL
      const updatedUser = await User.findByIdAndUpdate(req.user._id, updateData, { new: true });
      res.redirect('/user/profile');
    }
  } catch (error) {
    console.error('Profile Update Error:', error);
    res.render('edit-profile', {
      user: req.user,
      error: `Failed to update profile: ${error.message}`
    });
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('token').redirect('/');
});

module.exports = router;