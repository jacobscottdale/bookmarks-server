const express = require('express');
const xss = require('xss');
const logger = require('../logger');
const { isWebUri } = require('valid-url');
const BookmarksService = require('./bookmarks-service');

const bookmarksRouter = express.Router();
const bodyParser = express.json();

const sanitizeBookmark = (bookmark) => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: xss(bookmark.url),
  description: xss(bookmark.description),
  rating: Number(bookmark.rating),
});

bookmarksRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks.map(sanitizeBookmark));
      })
      .catch(next);
  })
  .post(bodyParser, (req, res, next) => {
    const { title, description, url, rating } = req.body;
    const newBookmark = { title, description, url, rating };

    for (const [key, value] of Object.entries(newBookmark))
      if (value == null)
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        });

    if (!isWebUri(url)) {
      logger.error(`Invalid URL supplied`);
      return res.status(400).json({
        error: { message: `'url' must be a valid URL` }
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      logger.error(`Invalid rating supplied`);
      return res.status(400).json({
        error: { message: `'rating' must be between 1 and 5` }
      });
    }

    BookmarksService.insertBookmark(
      req.app.get('db'),
      newBookmark
    )
      .then(bookmark => {
        res
          .status(201)
          .location(`/bookmarks/${bookmark.id}`)
          .json(sanitizeBookmark(bookmark))
      })
      .catch(next)
  });

bookmarksRouter
  .route('/bookmarks/:id')
  .all((req, res, next) => {
    BookmarksService.getById(
      req.app.get('db'),
      req.params.id
    )
      .then(bookmark => {
        if (!bookmark) {
          return res.status(404).json({
            error: { message: `Bookmark does not exist` }
          });
        }
        res.bookmark = bookmark;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(sanitizeBookmark(res.bookmark));
  })
  .delete((req, res, next) => {
    BookmarksService.deleteBookmark(
      req.app.get('db'),
      req.params.id
    )
    .then(() => {
      res.status(204).end();
    })
    .catch(next)
  })
  .patch(bodyParser, (req, res, next) => {
    const { title, description, url, rating } = req.body;
    const bookmarkToUpdate = { title, description, url, rating };

    const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length
    if (numberOfValues === 0)
      return res.status(400).json({
        error: {
          message: `Request must contain either 'title', 'description', 'url', or 'rating' `
        }
      })

    BookmarksService.updateBookmark(
      req.app.get('db'),
      req.params.id,
      bookmarkToUpdate
    )
    .then(numRowsAffected => {
      res.status(204).end()
    })
    .catch(next)
  })

module.exports = bookmarksRouter;