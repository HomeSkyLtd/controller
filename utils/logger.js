/*jshint esversion: 6 */

const colors = require("colors");
const fs = require("fs-extra");
const path = require("path");

const levels = {
    VERBOSE: 5,
    DEBUG: 4,
    INFO: 3,
    WARN: 2,
    ERROR: 1
};

var coloredStrings = {};
coloredStrings[levels.VERBOSE] = "VERB ".magenta;
coloredStrings[levels.DEBUG] = "DEBUG".cyan;
coloredStrings[levels.INFO] = "INFO ".green;
coloredStrings[levels.WARN] = "WARN ".yellow;
coloredStrings[levels.ERROR] = "ERROR".red;

var uncoloredStrings = {};
uncoloredStrings[levels.VERBOSE] = "VERB ";
uncoloredStrings[levels.DEBUG] = "DEBUG";
uncoloredStrings[levels.INFO] = "INFO ";
uncoloredStrings[levels.WARN] = "WARN ";
uncoloredStrings[levels.ERROR] = "ERROR";

const Logger = function(level, fileName) {
    this.level = level;
    this.fileName = fileName;
};

Logger.prototype.verbose = function(message) {
    if(this.level >= levels.VERBOSE)
        this._writeData(message, levels.VERBOSE);
};

Logger.prototype.debug = function(message) {
    if(this.level >= levels.DEBUG)
        this._writeData(message, levels.DEBUG);
};

Logger.prototype.info = function(message) {
    if(this.level >= levels.INFO)
        this._writeData(message, levels.INFO);
};

Logger.prototype.warn = function(message) {
    if(this.level >= levels.WARN)
        this._writeData(message, levels.WARN);
};

Logger.prototype.error = function(message) {
    this._writeData(message, levels.ERROR);
};

Logger.prototype._writeData = async function(message, level, logFileOnly = false) {
    if(!logFileOnly)
        console.log(`${coloredStrings[level]} [${new Date().toISOString()}] ${message}`);
    if(this.fileName)
        await fs.appendFile(this.fileName, `${uncoloredStrings[level]} [${new Date().toISOString()}] ${message}\n`);
};

module.exports = {
    Logger: new Logger(levels.VERBOSE),
    levels: levels
};