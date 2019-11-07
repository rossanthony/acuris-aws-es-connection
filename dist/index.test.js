"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const elasticsearch_1 = require("@elastic/elasticsearch");
describe('aws-es-connection', () => {
    let esClient;
    let indexPrefix;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        const esEndpoint = process.env.AWS_ES_ENDPOINT;
        if (!esEndpoint) {
            throw new Error('AWS_ES_ENDPOINT ENV not set. Make sure the env is set to a real AWS ES endpoint and that you have AWS credentials set.');
        }
        // Try make an API call to check credentials are good
        try {
            yield new aws_sdk_1.default.ES({ region: 'eu-west-1' }).listElasticsearchVersions().promise();
        }
        catch (err) {
            throw new Error('Failed to make an call to the AWS API. Check your AWS credentials are set and valid.');
        }
        const awsEsConnection = index_1.createAWSConnection(yield index_1.awsGetCredentials());
        esClient = index_1.awsCredsifyAll(new elasticsearch_1.Client({
            node: esEndpoint,
            Connection: awsEsConnection
        }));
        indexPrefix = `aws-es-connection-tests-${new Date().getTime()}`;
    }));
    test('aws creds are retrieved before each async call', () => __awaiter(void 0, void 0, void 0, function* () {
        const spy = jest.spyOn(aws_sdk_1.default.config.credentials, 'getPromise');
        yield esClient.cat.health();
        expect(spy).toHaveBeenCalled();
    }));
    test('aws creds are retrieved before each callback call', done => {
        const spy = jest.spyOn(aws_sdk_1.default.config.credentials, 'get');
        esClient.cat.health(() => {
            try {
                expect(spy).toHaveBeenCalled();
                done();
            }
            catch (err) {
                done(err);
            }
        });
    });
    test('indices async', () => __awaiter(void 0, void 0, void 0, function* () {
        const indexName = indexPrefix + '-indices-async';
        try {
            // Create and retrieve index
            yield esClient.indices.create({ index: indexName });
            const index = yield esClient.indices.get({ index: indexName });
            expect(Object.keys(index.body)).toContain(indexName);
        }
        finally {
            // Delete index
            yield esClient.indices.delete({ index: indexName });
        }
    }));
    test('indices callback', done => {
        const indexName = indexPrefix + '-indices-callback';
        const cleanUp = callback => {
            esClient.indices.delete({ index: indexName }, callback);
        };
        // Create and retrieve index
        esClient.indices.create({ index: indexName }, err => {
            if (err) {
                cleanUp(() => done(err));
            }
            esClient.indices.get({ index: indexName }, (err, index) => {
                if (err) {
                    cleanUp(() => done(err));
                }
                try {
                    expect(Object.keys(index.body)).toContain(indexName);
                    cleanUp(err => done(err));
                }
                catch (err) {
                    return cleanUp(() => done(err));
                }
            });
        });
    });
    test('indexing and searching', () => __awaiter(void 0, void 0, void 0, function* () {
        const indexName = indexPrefix + '-searching';
        const doc1 = { name: 'John', body: 'Hello world' };
        const doc2 = { name: 'Joe', body: 'Lorem ipsum' };
        const doc3 = { name: 'Abbie', body: 'Hello, look at this' };
        try {
            // Create index and index some docs
            yield esClient.indices.create({ index: indexName });
            yield esClient.index({ index: indexName, refresh: 'wait_for', body: doc1 });
            yield esClient.index({ index: indexName, refresh: 'wait_for', body: doc2 });
            yield esClient.index({ index: indexName, refresh: 'wait_for', body: doc3 });
            const result = yield esClient.search({ index: indexName, q: 'Hello' });
            expect(result.body.hits.total).toBe(2);
        }
        finally {
            // Clean up
            yield esClient.indices.delete({ index: indexName });
        }
    }));
});
