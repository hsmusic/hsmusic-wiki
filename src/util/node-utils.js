// Utility functions which are only relevant to particular Node.js constructs.

// Very cool function origin8ting in... http-music pro8a8ly!
// Sorry if we happen to 8e violating past-us's copyright, lmao.
export function promisifyProcess(proc, showLogging = true) {
    // Takes a process (from the child_process module) and returns a promise
    // that resolves when the process exits (or rejects, if the exit code is
    // non-zero).
    //
    // Ayy look, no alpha8etical second letter! Couldn't tell this was written
    // like three years ago 8efore I was me. 8888)

    return new Promise((resolve, reject) => {
        if (showLogging) {
            proc.stdout.pipe(process.stdout);
            proc.stderr.pipe(process.stderr);
        }

        proc.on('exit', code => {
            if (code === 0) {
                resolve();
            } else {
                reject(code);
            }
        })
    })
}
