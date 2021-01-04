const { expect } = require('chai')
const supertest = require('supertest')
const app = require('../src/app')
const { API_TOKEN } = require('../src/config');

describe('App', () => {
  it('GET / responds with 200 containing "Hello, world!', () => {
    return supertest(app)
      .get('/')
      .auth(API_TOKEN, { type: 'bearer' })
      .expect(200, 'Hello, world!')
  })
})