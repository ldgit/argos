const assert = require('assert');
const readConfiguration = require('../src/configuration-reader');
const getDefaultConfiguration = require('../src/default-configuration');

describe('readConfiguration', () => {
  it('should use default php configuration (to avoid BC breaks) if no configuration file given', () => {
    assert.deepEqual(readConfiguration(), getDefaultConfiguration());
  });

  it('should use default php configuration if given configuration file does not exist', () => {
    assert.deepEqual(readConfiguration('some/file/that/does/not/exist.js'), getDefaultConfiguration());
  });

  context('if given a configuration file', () => {
    it('should validate it', () => {
      assert.throws(() => {
        readConfiguration('test/fixtures/configuration-reader.test/invalid.config.js');
      }, TypeError);
    });

    it('should import and return it', () => {
      assert.deepEqual(readConfiguration('test/fixtures/configuration-reader.test/valid.config.js').environments, [
        {
          extension: 'js',
          testNameSuffix: '.test',
          testDir: 'test/unit',
          sourceDir: 'src',
          arguments: ['-v'],
          testRunnerCommand: 'node_modules/.bin/mocha',
        },
      ]);
    });

    it('should lowercase each environment extension automatically', () => {
      const config = readConfiguration('test/fixtures/configuration-reader.test/technically.valid.config.js');
      assert.equal(config.environments[0].extension, 'php');
      assert.equal(config.environments[1].extension, 'js');
    });

    it('should use empty string for sourceDir if source is current directory', () => {
      const config = readConfiguration('test/fixtures/configuration-reader.test/technically.valid.config.js');
      assert.equal(config.environments[0].sourceDir, '');
      assert.equal(config.environments[1].sourceDir, '');
      assert.equal(config.environments[2].sourceDir, '');
    });

    it('should trim source directory when reading it', () => {
      const config = readConfiguration('test/fixtures/configuration-reader.test/technically.valid.config.js');
      assert.equal(config.environments[3].sourceDir, 'src');
    });
  });

  context('configFileFound property', () => {
    it('should be set to true if file was found, false otherwise', () => {
      // Deliberately put all assertions inside one test to ensure that the state was correctly mantained
      let config = readConfiguration('test/fixtures/configuration-reader.test/valid.config.js');
      assert.strictEqual(config.configFileFound, true);
      config = readConfiguration('test/fixtures/configuration-reader.test/nonexistent.config.js');
      assert.strictEqual(config.configFileFound, false);
      config = readConfiguration('test/fixtures/configuration-reader.test/valid.config.js');
      assert.strictEqual(config.configFileFound, true);
      config = readConfiguration();
      assert.strictEqual(config.configFileFound, false);
    });
  });
});
