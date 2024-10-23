const { Mutex } = require('async-mutex');

let globalMutex;

module.exports = {

    getMutex: async () => {

        if (!globalMutex) {
            globalMutex = new Mutex();
        }

        return globalMutex;
    }
}