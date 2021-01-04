const knex = require('knex');
const app = require('../src/app');
const { makeBookmarksArray } = require('./bookmarks.fixtures');
const { API_TOKEN } = require('../src/config');
const supertest = require('supertest');
const { expect } = require('chai');

describe('Bookmarks Endpoints', () => {
  let db;
  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL
    });
    app.set('db', db);
  });

  after('disconnect from db', () => db.destroy());

  before('clean the table', () => db('bookmarks').truncate());

  afterEach('cleanup', () => db('bookmarks').truncate());

  describe('GET /bookmarks', () => {
    context('Given no bookmarks', () => {
      it('responds with 200 and an empty array', () => {
        return supertest(app)
          .get('/bookmarks')
          .auth(API_TOKEN, { type: 'bearer' })
          .expect(200, []);
      });
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks);
      });

      it('responds with 200 and all of the bookmarks', () => {
        return supertest(app)
          .get('/bookmarks')
          .auth(API_TOKEN, { type: 'bearer' })
          .expect(200, testBookmarks);
      });
    });
  });

  describe('GET /bookmarks/:id', () => {
    context('Given no bookmarks', () => {
      it(`responds with 404`, () => {
        const id = 246;

        return supertest(app)
          .get(`/bookmarks/${id}`)
          .auth(API_TOKEN, { type: 'bearer' })
          .expect(404, { error: { message: `Bookmark does not exist` } });
      });
    });

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks);
      });

      it('responds with 200 and the specified bookmark', () => {
        const id = 2;
        const expectedBookmark = testBookmarks[id - 1];

        return supertest(app)
          .get(`/bookmarks/${id}`)
          .auth(API_TOKEN, { type: 'bearer' })
          .expect(200, expectedBookmark);
      });
    });
  });

  describe(`POST /bookmarks`, () => {
    it(`creates a bookmark, responding with 201 and the new article`, () => {
      const newBookmark = {
        title: 'Test new bookmark',
        description: 'Test description',
        url: 'https://www.google.com',
        rating: 5,
      };
      return supertest(app)
        .post('/bookmarks')
        .auth(API_TOKEN, { type: 'bearer' })
        .send(newBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title);
          expect(res.body.description).to.eql(newBookmark.description);
          expect(res.body.url).to.eql(newBookmark.url);
          expect(res.body.rating).to.eql(newBookmark.rating);
          expect(res.body).to.have.property('id');
          expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`);
        })
        .then(res =>
          supertest(app)
            .get(`/bookmarks/${res.body.id}`)
            .auth(API_TOKEN, { type: 'bearer' })
            .expect(res.body)
        );
    });
  });
});