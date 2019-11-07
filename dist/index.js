"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const http_1 = __importDefault(require("http"));
const aws4_1 = require("aws4");
const elasticsearch_1 = require("@elastic/elasticsearch");
const whitelisted_props_1 = __importDefault(require("./whitelisted-props"));
class AWSConnection extends elasticsearch_1.Connection {
    constructor(opts) {
        super(opts);
        this.makeRequest = this.signedRequest;
    }
    signedRequest(reqParams) {
        if (!reqParams.body && reqParams.headers['Content-Length']) {
            delete reqParams.headers['Content-Length'];
        }
        return http_1.default.request(aws4_1.sign(reqParams, this.awsCredentials));
    }
}
function createAWSConnection(awsCredentials) {
    AWSConnection.prototype.awsCredentials = awsCredentials;
    return AWSConnection;
}
exports.createAWSConnection = createAWSConnection;
exports.awsCredsify = (originalFunc) => {
    return (params, options, callback) => {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        if (typeof params === 'function' || params == null) {
            callback = params;
            params = {};
            options = {};
        }
        // Wrap promise API
        const isPromiseCall = typeof callback !== 'function';
        if (isPromiseCall) {
            return aws_sdk_1.default.config.credentials
                .getPromise()
                .then(() => originalFunc.call(this, params, options, callback));
        }
        //Wrap callback API
        ;
        aws_sdk_1.default.config.credentials.get(err => {
            if (err) {
                callback(err, null);
                return;
            }
            originalFunc(params, options, callback);
        });
    };
};
exports.awsCredsifyAll = (object, isNested = false) => {
    for (const key of Object.getOwnPropertyNames(object)) {
        if (!isNested && !whitelisted_props_1.default.includes(key)) {
            continue;
        }
        // Go 1 level deep and wrap the nested functions
        if (!isNested && typeof object[key] === 'object') {
            object[key] = exports.awsCredsifyAll(object[key], true);
            continue;
        }
        // Wrap all the functions that exist on the object and not its parents
        const descriptor = Object.getOwnPropertyDescriptor(object, key);
        if (!descriptor.get) {
            const func = object[key];
            if (typeof func === 'function') {
                object[key] = exports.awsCredsify(func);
            }
        }
    }
    return object;
};
exports.awsGetCredentials = () => {
    return new Promise((resolve, reject) => {
        aws_sdk_1.default.config.getCredentials(err => {
            if (err) {
                return reject(err);
            }
            resolve(aws_sdk_1.default.config.credentials);
        });
    });
};
