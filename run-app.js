var spawn = require('child_process').spawn;

var processes = {
  app: {
    cmd: 'node',
    args: ['app.js']
  },
  screencap: {
    cmd: 'phantomjs',
    args: ['screencap.js']
  }
};

var RESTART_DELAY = 5;

function restart(name) {
  var info = processes[name];
  var process = spawn(info.cmd, info.args);
  console.log('starting', name, 'with cmdline',
              '"' + info.cmd + ' ' + info.args.join(' ') + '"',
              'and pid', process.pid);
  process.on('exit', function(code, signal) {
    console.log('process', name, 'exited with code', code,
                'and signal', signal);
    console.log('restarting', name, 'in', RESTART_DELAY, 'seconds');
    setTimeout(function() {
      restart(name);
    }, RESTART_DELAY * 1000);
  });
  process.stdout.on('data', function(chunk) {
    console.log(name, 'stdout: ' + chunk);
  });
  process.stderr.on('data', function(chunk) {
    console.log(name, 'stderr: ' + chunk);
  });
}

Object.keys(processes).forEach(restart);
