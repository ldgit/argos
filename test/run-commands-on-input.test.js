const assert = require('assert');
const { WriteableMock, ReadableMock } = require('./helpers/mockStdio');
const {
  listenForUserInput,
  stopListeningForUserInput,
  unconfiguredListenForUserInput,
  setLastRunCommands,
} = require('./../src/run-commands-on-input');
const createRunCommandsSpy = require('./helpers/run-commands-spy');
const { format, createPrinterSpy } = require('../src/printer');

const wait = time => new Promise(resolve => setTimeout(resolve, time));

describe('configureListenForInput', () => {
  let mockStdin;
  let mockStdout;
  let listenForInput;
  let runCommandsSpy;
  let printerSpy;
  let processExitCalled;
  let processExitCalledPromise;
  let environments;

  beforeEach(() => {
    environments = [{ testRunnerCommand: 'vendor/bin/phpunit', arguments: [] }];
    mockStdin = new ReadableMock({ decodeStrings: false });
    mockStdin.pause();
    mockStdout = new WriteableMock({ decodeStrings: false });
    runCommandsSpy = createRunCommandsSpy();
    printerSpy = createPrinterSpy();

    processExitCalled = false;
    let processExit;
    processExitCalledPromise = new Promise((resolve) => {
      processExit = () => {
        processExitCalled = true;
        resolve();
      };
    });

    listenForInput = unconfiguredListenForUserInput.bind(
      null, mockStdin, mockStdout, processExit, runCommandsSpy, printerSpy
    );
  });

  it('should start listening for user input in raw mode', () => {
    listenForInput(environments);
    assert.strictEqual(mockStdin.isInRawMode(), true);
    assert.strictEqual(mockStdin.isPaused(), false);
  });

  it('should use utf8 encoding', () => {
    listenForInput(environments);
    assert.strictEqual(mockStdin.getEncoding(), 'utf8');
  });

  it('should stop the program if given ctrl+c command', () => {
    listenForInput(environments);
    mockStdin.push('\u0003');
    return processExitCalledPromise;
  });

  it('should not stop the program otherwise', () => {
    listenForInput(environments);
    mockStdin.push('not important');
    return wait(30).then(() => assert.strictEqual(processExitCalled, false));
  });

  it('should not do anything if user gives it unrecognized command', () => {
    listenForInput(environments);
    mockStdin.push('w');
    assert.strictEqual(runCommandsSpy.getCommandsBatchRunCount(), 0, 'Should not run any commands');
  });

  it('should list available commands when user inputs "l"', () => {
    listenForInput(environments);

    assert.strictEqual(printerSpy.getPrintedMessages().length, 0, 'Messages should not be printed before "l" is pressed');
    return new Promise((resolve) => {
      mockStdin.on('data', resolve);
      mockStdin.push('l');
    }).then(() => {
      assert.strictEqual(runCommandsSpy.getCommandsBatchRunCount(), 0, 'Should not run any commands in this commands');
      assert.deepStrictEqual(printerSpy.getPrintedMessages()[0], { text: 'Commands list', type: 'title' });
      assert.deepStrictEqual(printerSpy.getPrintedMessages()[1], {
        text: `  press ${format.yellow('r')} to rerun last test batch`,
        type: 'message',
      });
      assert.deepStrictEqual(printerSpy.getPrintedMessages()[2], {
        text: `  press ${format.green('a')} to run all tests`,
        type: 'message',
      });
    });
  });

  it('should not do anything if ordered to run last test batch, but no tests have run yet', () => {
    listenForInput(environments);

    return new Promise((resolve) => {
      mockStdin.on('data', resolve);
      mockStdin.push('r');
    }).then(() => {
      assert.strictEqual(runCommandsSpy.getCommandsBatchRunCount(), 0, 'No commands yet');
    });
  });

  it('should rerun last batch of commands when user inputs "r"', () => {
    const commands = [{ command: 'echo', args: ['a unit test command?'] }];
    listenForInput(environments);
    setLastRunCommands(commands);
    assert.strictEqual(runCommandsSpy.getCommandsBatchRunCount(), 0, 'No commands should be run before user input.');

    return new Promise((resolve) => {
      mockStdin.on('data', resolve);
      mockStdin.push('r');
    }).then(() => {
      assert.strictEqual(runCommandsSpy.getCommandsBatchRunCount(), 1);
      assert.deepStrictEqual(runCommandsSpy.getLastRunCommands(), commands);
      assert.strictEqual(printerSpy.getPrintedMessages().length, 0, 'No messages should be printed on the screen');
    });
  });

  it('should run all tests when user inputs "a"', () => {
    environments = [{ testRunnerCommand: 'vendor/bin/phpunit', arguments: [] }];

    listenForInput(environments);

    return new Promise((resolve) => {
      mockStdin.on('data', resolve);
      assert.strictEqual(runCommandsSpy.getCommandsBatchRunCount(), 0, 'Command must run only on user input');
      mockStdin.push('a');
    }).then(() => {
      assert.strictEqual(runCommandsSpy.getCommandsBatchRunCount(), 1);
      assert.deepStrictEqual(runCommandsSpy.getLastRunCommands(), [{ command: 'vendor/bin/phpunit', args: [] }]);
    });
  });

  it('should run all tests when user inputs "a" (multiple environments)', () => {
    environments = [
      { testRunnerCommand: 'vendor/bin/phpunit', arguments: [] },
      { testRunnerCommand: 'vendor/bin/phpunit', arguments: [] },
      { testRunnerCommand: 'mocha', arguments: [] },
    ];

    listenForInput(environments);

    return new Promise((resolve) => {
      mockStdin.on('data', resolve);
      mockStdin.push('a');
    }).then(() => {
      assert.deepStrictEqual(runCommandsSpy.getLastRunCommands(), [
        { command: 'vendor/bin/phpunit', args: [] },
        { command: 'mocha', args: [] },
      ]);
    });
  });

  it('should run all tests when user inputs "a" (multiple of same type, but with additional arguments)', () => {
    environments = [
      { testRunnerCommand: 'vendor/bin/phpunit', arguments: ['-c', 'phpunit.xml'] },
      { testRunnerCommand: 'vendor/bin/phpunit', arguments: ['-c', 'phpunit-integration.xml'] },
      { testRunnerCommand: 'mocha', arguments: [] },
    ];

    listenForInput(environments);

    return new Promise((resolve) => {
      mockStdin.on('data', resolve);
      mockStdin.push('a');
    }).then(() => {
      assert.deepStrictEqual(runCommandsSpy.getLastRunCommands(), [
        { command: 'vendor/bin/phpunit', args: ['-c', 'phpunit.xml'] },
        { command: 'vendor/bin/phpunit', args: ['-c', 'phpunit-integration.xml'] },
        { command: 'mocha', args: [] },
      ]);
    });
  });
});

describe('configured user input listener', () => {
  it('can be called and closed without problems', () => {
    listenForUserInput([]);
    assert.strictEqual(process.stdin.isPaused(), false);
    process.stdin.pause();
    assert.strictEqual(process.stdin.isPaused(), true);
    stopListeningForUserInput();
  });
});