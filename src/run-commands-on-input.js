const { runCommands } = require('./command-runner');
const { format, consolePrinter } = require('../src/printer');

module.exports = {
  listenForUserInput: unconfiguredListenForUserInput.bind(
    null, process.stdin, process.stdout, process.exit, runCommands, consolePrinter
  ),
  stopListeningForUserInput: unconfiguredStopListeningForUserInput.bind(null, process.stdin, process.stdout),
  unconfiguredListenForUserInput,
  setLastRunCommands,
};

let lastRunCommands = null;

function setLastRunCommands(lastRunCommandBatch) {
  lastRunCommands = lastRunCommandBatch;
}

// eslint-disable-next-line no-shadow
function unconfiguredListenForUserInput(stdin, stdout, processExit, runCommands, printer, environments) {
  stdin.setRawMode(true);
  stdin.setEncoding('utf8');
  stdin.resume();

  stdin.on('data', (key) => {
    if (key === 'a') {
      const commandsToRunAllTests = environments
        .map(environment => ({ command: environment.testRunnerCommand, args: environment.arguments }))
        .reduce((accumulator, currentCommand) => {
          if (!arrayContainsObject(accumulator, currentCommand)) {
            accumulator.push(currentCommand);
          }
          return accumulator;
        }, []);

      runCommands(commandsToRunAllTests);
    }

    if (key === 'l') {
      printer.title('Commands list');
      printer.message(`  press ${format.yellow('r')} to rerun last test batch`);
      printer.message(`  press ${format.green('a')} to run all tests`);
    }

    if (key === 'r' && lastRunCommands !== null) {
      runCommands(lastRunCommands);
    }

    if (key === '\u0003') {
      processExit();
    }
  });
}

function unconfiguredStopListeningForUserInput() {
}

function arrayContainsObject(array, objectNeedle) {
  return array.map(object => JSON.stringify(object)).includes(JSON.stringify(objectNeedle));
}