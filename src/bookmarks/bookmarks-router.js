const express = require('express');
const logger = require('../logger');
const { isWebUri } = require('valid-url');
const { v4: uuid } = require('uuid');
const { bookmarks } = require('../store');
const BookmarksService = require('./bookmarks-service')
const bookmarksRouter = express.Router();
const bodyParser = express.json();

bookmarksRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks)
      })
      .catch(next)
  })
  .post(bodyParser, (req, res) => {
    const { title, description, url, rating } = req.body;

    if (!title) {
      logger.error(`Title is required`);
      return res.status(400).send('Invalid Data');
    }

    if (!isWebUri(url)) {
      logger.error(`Invalid URL supplied`);
      return res.status(400).send(`'url' must be a valid URL`);
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      logger.error(`Invalid rating supplied`);
      return res.status(400).send(`'rating' must be between 1 and 5`);
    }

    const bookmark = {
      id: uuid(),
      title,
      description,
      url,
      rating
    };

    bookmarks.push(bookmark);

    logger.info(`Bookmark with id ${bookmark.id} created`);

    res.status(201)
      .location(`http://localhost:8000/bookmark/${bookmark.id}`)
      .json(bookmark);
  });

bookmarksRouter
  .route('/bookmarks/:id')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
  BookmarksService.getById(knexInstance, req.params.id)
    .then(bookmark => {
      if (!bookmark) {
        return res.status(404).json({
          error: { message: `Bookmark doesn't exist` }
        })
      }
      res.json(bookmark)
    })
    .catch(next)
  })
  .delete((req, res) => {
    const { id } = req.params;
    const bookmarkIndex = bookmarks.findIndex(b => b.id == id);
    if (bookmarkIndex === -1) {
      logger.error(`Bookmark with id ${id} not found`);
      return res.status(404).send('Bookmark Not Found');
    }
    bookmarks.splice(bookmarkIndex, 1);

    logger.info(`Bookmark with id ${id} deleted.`);

    res.status(204).end();
  });

module.exports = bookmarksRouter;