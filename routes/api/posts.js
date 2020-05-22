const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const passport = require("passport");

// Load Post Model
const Post = require("../../models/Post");
const Profile = require("../../models/Profile");

// Load Validation
const validatePostInput = require("../../validation/post");

/*
  @route   GET api/posts/test
  @desc    Tests post route
  @access  Public
*/
router.get("/test", (req, res) =>
  res.json({
    msg: "Posts Works!",
  })
);

/*
  @route   GET api/posts
  @desc    Get all posts
  @access  Public
*/
router.get("/", (req, res) => {
  Post.find()
    .sort({ date: -1 })
    .then((posts) => res.json(posts))
    .catch((err) => res.status(404).json({ nopostfound: "No post(s) found." }));
});

/*
  @route   GET api/posts/:id
  @desc    Get post by id
  @access  Public
*/
router.get("/:post_id", (req, res) => {
  Post.findById(req.params.post_id)
    .then((post) => res.json(post))
    .catch((err) =>
      res.status(404).json({ nopostfound: "No post found with that ID" })
    );
});

/*
  @route   POST api/posts
  @desc    Create post
  @access  Private
*/
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    // Check Validation
    if (!isValid) {
      // If any errors, send 400 with errrors object
      return res.status(400).json(errors);
    }

    Profile.findOne({ user: req.user.id }).then((profile) => {
      if (!profile) {
        res
          .status(404)
          .json({ create_profile: "Please create a profile first." });
      }

      const newPost = new Post({
        text: req.body.text,
        name: req.body.name,
        avatar: req.user.avatar,
        user: req.user.id,
      });

      newPost.save().then((post) => res.json(post));
    });
  }
);

/*
  @route   DELETE api/posts/:id
  @desc    Delete post
  @access  Private
*/
router.delete(
  "/:post_id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then((profile) => {
      Post.findById(req.params.post_id)
        .then((post) => {
          // Check for post owner
          if (post.user.toString() !== req.user.id) {
            return res
              .status(401)
              .json({ notauthorized: "User not authorized!" });
          }

          // Delete
          post
            .remove()
            .then(() => res.json({ success: "Post deleted successfully." }));
        })
        .catch((err) =>
          res.status(404).json({ postnotfound: "No post found!" })
        );
    });
  }
);

/*
  @route   POST api/posts/like/:id
  @desc    Like post
  @access  Private
*/
router.post(
  "/like/:post_id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then((profile) => {
      if (!profile) {
        res
          .status(404)
          .json({ create_profile: "Please create a profile first." });
      }
      Post.findById(req.params.post_id)
        .then((post) => {
          if (
            post.likes.filter((like) => like.user.toString() === req.user.id)
              .length > 0
          ) {
            return res
              .status(400)
              .json({ alreadylike: "User already like this post." });
          }

          // Add the user id to likes array
          post.likes.unshift({ user: req.user.id });

          post.save().then((post) => res.json(post));
        })
        .catch((err) =>
          res.status(404).json({ postnotfound: "No post found." })
        );
    });
  }
);

/*
  @route   POST api/posts/unlike/:id
  @desc    Unlike post
  @access  Private
*/
router.post(
  "/unlike/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then((profile) => {
      Post.findById(req.params.id)
        .then((post) => {
          if (
            post.likes.filter((like) => like.user.toString() === req.user.id)
              .length === 0
          ) {
            return res
              .status(400)
              .json({ notyetlike: "You have not yet like this post." });
          }

          // Get remove index
          const removeIndex = post.likes
            .map((item) => item.user.toString())
            .indexOf(req.user.id);

          // Splice out of array
          post.likes.splice(removeIndex, 1);

          // Save
          post.save().then((post) => res.json(post));
        })
        .catch((err) =>
          res.status(404).json({ postnotfound: "No post found!" })
        );
    });
  }
);

/*
  @route   POST api/posts/comment/:post_id
  @desc    Add comment to a post
  @access  Private
*/
router.post(
  "/comment/:post_id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    // Check Validation
    if (!isValid) {
      // If any errors, send 400 with errrors object
      return res.status(400).json(errors);
    }

    Profile.findOne({ user: req.user.id }).then((profile) => {
      if (!profile) {
        res.status(404).json({
          create_profile: "Please create a profile first to comment.",
        });
      }

      Post.findById(req.params.post_id)
        .then((post) => {
          const newComment = {
            text: req.body.text,
            name: req.body.name,
            avatar: req.user.avatar,
            user: req.user.id,
          };

          // Add to comments array
          post.comments.unshift(newComment);

          // Save
          post.save().then((post) => res.json(post));
        })
        .catch((err) => res.status(404).json({ nopost: "No post found." }));
    });
  }
);

/*
  @route   DELETE api/posts/comment/:post_id/:comment_id
  @desc    Remove comment from post
  @access  Private
*/
router.delete(
  "/comment/:post_id/:comment_id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then((profile) => {
      Post.findById(req.params.post_id)
        .then((post) => {
          // Check if comment exist

          if (
            post.comments.filter(
              (comment) => comment._id.toString() === req.params.comment_id
            ).length === 0
          ) {
            return res
              .status(404)
              .json({ nocomment: "Comment does not exist" });
          }

          // Get the removeIndex
          const removeIndex = post.comments
            .map((item) => item._id.toString())
            .indexOf(req.params.comment_id);

          // Splice comment out of array
          post.comments.splice(removeIndex, 1);

          // Save
          post.save().then((post) => res.json(post));
        })
        .catch((err) =>
          res.status(404).json({ postnotfound: "No post found!" })
        );
    });
  }
);

module.exports = router;
