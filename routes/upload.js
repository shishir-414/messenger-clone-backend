const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();

const storage = multer.diskStorage({
    destination: "./uploads/",
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

router.post("/upload", upload.single("profilePic"), (req, res) => {
    res.json({ imagePath: `/uploads/${req.file.filename}` });
});

module.exports = router;
