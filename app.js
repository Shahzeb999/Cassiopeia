require('dotenv').config();

const path = require('path')
const express = require('express')
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

const userRoute = require('./routes/user');
const blogRoute = require('./routes/blog');

const Blog = require('./models/blog')

const { checkForAuthenticationCookie } = require('./middlewares/authentication');

const app = express();
const PORT = process.env.PORT || 8000;

const connectionParams = {
    useNewUrlParser: true, // Removed, deprecated
    useUnifiedTopology: true, // Removed, deprecated
}

mongoose.connect(process.env.MONGO_URL, connectionParams)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.set("view engine", "ejs");
app.set("views", path.resolve('./views'));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token"));

app.use(express.static(path.resolve('./public')))

// Custom function to add timeout to find() operations
const findWithTimeout = async (query, timeout) => {
    return new Promise((resolve, reject) => {
        let isRejected = false;
        const timeoutId = setTimeout(() => {
            isRejected = true;
            reject(new Error('MongoDB query timeout exceeded'));
        }, timeout);

        query.exec().then(result => {
            if (!isRejected) {
                clearTimeout(timeoutId);
                resolve(result);
            }
        }).catch(error => {
            if (!isRejected) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    });
};

app.get('/', async (req, res) => {
    try {
        const allBlogs = await findWithTimeout(
            Blog.find({}).populate("createdBy"),
            10000 // Timeout in milliseconds
        );
        res.render("home", {
            user: req.user,
            blogs: allBlogs,
        });
    } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get('/myblogs', async (req, res) => {
    try {
        const allBlogs = await findWithTimeout(
            Blog.find({}).populate("createdBy"),
            10000 // Timeout in milliseconds
        );
        res.render("myblogs", {
            user: req.user,
            blogs: allBlogs,
        });
    } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.use('/user', userRoute);
app.use('/blog', blogRoute);

app.listen(PORT, () => console.log(`Server Started at Port:${PORT}`));
