const gulp = require('gulp'),
  path = require('path'),
  mocha = require('gulp-spawn-mocha'),
  karmaServer = require('karma').Server,
  Chimp = require('chimp'),
  ProcessManager = require('./process-manager'),
  processManager = new ProcessManager(),
  extend = require('util')._extend,
  runSequence = require('run-sequence'),
  karmaOptions = require('./config/karma.options'),
  mochaOptions = require('./config/mocha.options'),
  chimpDomainOptions = require('./config/chimp.domain.options'),
  chimpE2EOptions = require('./config/chimp.e2e.options');

gulp.task('karma', function (done) {
  new karmaServer(karmaOptions, done).start();
});

gulp.task('watchKarma', function () {
  console.log('Karma is running in watch mode'.white);
  karmaOptions.singleRun = false;
  gulp.start('karma');
});

gulp.task('mocha', function () {
  return gulp.src(mochaOptions.files, {read: false})
    .pipe(mocha(mochaOptions));
});

gulp.task('watchMocha', function () {
  console.log('Mocha is running in watch mode'.white);
  gulp.start('mocha');
  gulp.watch(mochaOptions.watchDir, function (event) {
    if (!event.path.match(/browser|ui/)) {
      gulp.start('mocha');
    }
  });
});

// TODO remove this smelly code. The real issue is that Chimp should exit without hogging the process
let finishShouldWaitForParam = false;
function finish(done, exitParam) {
  return function (error) {
    if (error) {
      console.error(error);
    }
    if (!finishShouldWaitForParam || (finishShouldWaitForParam && exitParam)) {
      process.exit(!!error)
    }
    done(error);
  }
}

gulp.task('chimpDomain', function (done) {
  const chimpDefaultOptions = require(path.resolve(process.cwd() + '/node_modules/chimp/dist/bin/default.js'));
  chimpDomainOptions._ = [];
  const options = Object.assign({}, chimpDefaultOptions, chimpDomainOptions);
  const chimp = new Chimp(options);
  chimp.init(finish(done));
});

gulp.task('watchChimpDomain', function () {
  chimpDomainOptions.watch = true;
  gulp.start('chimpDomain');
});

gulp.task('chimpE2E', function (done) {
  const chimpDefaultOptions = require(path.resolve(process.cwd() + '/node_modules/chimp/dist/bin/default.js'));
  chimpE2EOptions._ = [];
  const options = Object.assign({}, chimpDefaultOptions, chimpE2EOptions);
  process.env.DEBUG = 'true';
  const chimp = new Chimp(options);
  chimp.init(finish(done));
});

gulp.task('watchChimpE2E', function () {
  chimpE2EOptions.watch = true;
  gulp.start('chimpE2E');
});

gulp.task('default', ['watchMocha', 'watchKarma', 'watchChimpDomain', 'watchChimpE2E']);

gulp.task('test', function (done) {
  finishShouldWaitForParam = true;
  runSequence('mocha', 'karma', 'chimpDomain', 'chimpE2E', finish(done, true));
});

gulp.task('startMeteor', function (done) {
  const srcDir = path.resolve(__dirname, 'src');
  processManager.startProcess({
    name: 'Meteor App',
    command: `meteor --settings ${srcDir}/settings.json --port 3000`,
    waitForMessage: 'App running at',
    options: {
      cwd: srcDir,
      env: extend({
        ROOT_URL: 'http://localhost:3000'
      }, process.env)
    }
  }, done);
});
