const assert = require('chai').assert;
const expect = require('chai').expect;
require('chai').should();
const request = require('supertest');
const path = require('path');
const Walter = require('../lib/walter');

const CONFIG_FILE = './resources/config_test_example.yaml';

describe('Walter', function () {

  describe('#Activation', function () {
    it('should throw an error when no config file is given', function () {
      expect(() => new Walter()).to.throw('Configuration file is required.')
    });

    it('should be listening on the given port', function () {
      const configFile = path.resolve(__dirname, CONFIG_FILE);
      const port = 9000;

      const walter = new Walter(configFile, port);
      walter.activate();

      walter.server.listening.should.equal(true);
      walter.server.address().port.should.equal(port);

      walter.deactivate();
    });
  });

  describe('#Content negotiation', function() {
    before('Activating Walter', function () {
      const configFile = path.resolve(__dirname, CONFIG_FILE);
      const port = 9000;

      this.walter = new Walter(configFile, port);
      this.walter.activate();
    });

    after('Deactivating Walter', function () {
      this.walter.deactivate();
    });


    it('should be able to serve text/html when requested', function(done) {
      request(this.walter.app)
        .get('/movies/Angelina_Jolie')
        .set('Accept', 'text/html')
        .expect('Content-Type', /text\/html/)
        .expect(checkBody)
        .end(done);

      function checkBody(res) {
        const isHTML = require('is-html');
        return isHTML((res.body));
      }
    });

    it('should be able to serve application/ld+json when requested', function(done) {
      request(this.walter.app)
        .get('/movies/Angelina_Jolie')
        .set('Accept', 'application/ld+json')
        .expect('Content-Type', /application\/ld\+json/)
        .expect(checkBody)
        .end(done);

      async function checkBody(res) {
        const jsonld = require('jsonld');
        // If 'JsonLD' can turn it into N-Quads without errors, then it must be valid JSON-LD
        await jsonld.toRDF(res.body, {format: 'application/n-quads'}, (err, nquads) => {
          if (err) {
            throw(err);
          }
        });
      }
    });

    it('should be able to serve text/turtle when requested', function(done) {
      request(this.walter.app)
        .get('/movies/Angelina_Jolie')
        .set('Accept', 'text/turtle')
        .expect('Content-Type', /text\/turtle/)
        .expect(checkBody)
        .end(done);

      function checkBody(res) {
        const N3 = require('n3');
        const parser = new N3.Parser({format: 'Turtle'});
        // If 'N3' can parse it, then it must be valid turtle
        parser.parse(res.text);
      }
    });

    it('should be able to serve application/n-triples when requested', function(done) {
      request(this.walter.app)
        .get('/movies/Angelina_Jolie')
        .set('Accept', 'application/n-triples')
        .expect('Content-Type', /application\/n-triples/)
        .expect(checkBody)
        .end(done);

      function checkBody(res) {
        const N3 = require('n3');
        const parser = new N3.Parser({format: 'N-Triples'});
        // If 'N3' can parse it, then it must be valid N-triples
        parser.parse(res.text);
      }
    });

    it('should be able to serve application/n-quads when requested', function(done) {
      request(this.walter.app)
        .get('/movies/Angelina_Jolie')
        .set('Accept', 'application/n-quads')
        .expect('Content-Type', /application\/n-quads/)
        .expect(checkBody)
        .end(done);

      function checkBody(res) {
        const N3 = require('n3');
        const parser = new N3.Parser({format: 'N-Quads'});
        // If 'N3' can parse it, then it must be valid N-quads
        parser.parse(res.text);
      }
    });

  });

  describe('#Functionality', function () {
    before('Activating Walter', function () {
      const configFile = path.resolve(__dirname, CONFIG_FILE);
      const port = 9000;

      this.walter = new Walter(configFile, port);
      this.walter.activate();
    });

    after('Deactivating Walter', function () {
      this.walter.deactivate();
    });

    it('should make the routes specified in the config file available', function (done) {
      request(this.walter.app)
        .get('/movies/Angelina_Jolie')
        .expect(200, done);
    });

    it('should execute the GraphQL-LD queries linked to a route', function (done) {
      request(this.walter.app)
        .get('/movies/Angelina_Jolie')
        .set('Accept', 'application/json')
        .expect(checkBody)
        .end(done);

      function checkBody(res) {
        assert(Array.isArray(res.body), 'GraphQL-LD query not correctly executed');
      }
    });

    it('should apply the specified pipe modules', function(done) {
      request(this.walter.app)
        .get('/movies/Angelina_Jolie')
        .set('Accept', 'application/json')
        .expect(check)
        .end(done);

      function check(res) {
        const filter = require('./resources/filterT').filterT;

        const origLength = res.body.length;
        const filteredData = filter(res.body);

        assert.lengthOf(filteredData.data, origLength, 'Pipe module probably not applied');
      }
    });
  })
});