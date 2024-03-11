const { Router } = require('express');
const multer = require('multer');
const aws = require('aws-sdk');
const Blog = require('../models/blog');
const Comment = require('../models/comment');
const util = require('util');

const router = Router();

// AWS S3 setup
const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION // Replace with your AWS region
});

const bucketName = 'shahzeb-blogify'; // Replace with your S3 bucket name

const upload = multer({
  storage: multer.memoryStorage(), // Store the file in memory before uploading to S3
  limits: {
    fileSize: 10 * 1024 * 1024 // Limit file size to 10MB (adjust as needed)
  }
});

const s3Upload = util.promisify(s3.upload.bind(s3));

router.get("/add-new", (req, res) => {
  return res.render('addBlog', {
    user: req.user
  });
});

router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate("createdBy");
    const comments = await Comment.find({ blogId: req.params.id }).populate("createdBy");
    return res.render('blog', {
      user: req.user,
      blog,
      comments
    });
  } catch (error) {
    console.error('Error fetching blog:', error);
    return res.status(500).send('Internal Server Error');
  }
});

router.post("/", upload.single("coverImage"), async (req, res) => {
  const { title, body } = req.body;

  try {
    // Upload image to Amazon S3
    const imageFile = req.file;
    const fileName = `${Date.now()}-${imageFile.originalname}`;

    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: imageFile.buffer,
      ContentType: imageFile.mimetype
    };

    const data = await s3Upload(params);

    const coverImageURL = data.Location;

    // Create the blog post with the S3 image URL
    const blog = await Blog.create({
      body,
      title,
      createdBy: req.user._id,
      coverImageURL,
    });

    res.redirect(`/blog/${blog._id}`);
  } catch (error) {
    console.error('Error creating blog post:', error);
    res.render('addBlog', {
      user: req.user,
      error: `Failed to create blog post: ${error.message}`
    });
  }
});

router.post('/comment/:blogId', async (req, res) => {
  try {
    await Comment.create({
      content: req.body.content,
      blogId: req.params.blogId,
      createdBy: req.user._id
    });

    res.redirect(`/blog/${req.params.blogId}`);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.redirect(`/blog/${req.params.blogId}`);
  }
});

router.post('/delete/:blogId', async (req, res) => {
  try {
    await Blog.deleteOne({ _id: req.params.blogId });
    res.redirect("/");
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.redirect("/");
  }
});

module.exports = router;
