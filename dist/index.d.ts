import AWS from 'aws-sdk';
import { Client, Connection } from '@elastic/elasticsearch';
declare class AWSConnection extends Connection {
    awsCredentials: any;
    constructor(opts: any);
    private signedRequest;
}
export declare function createAWSConnection(awsCredentials: AWS.Credentials): typeof AWSConnection;
export declare const awsCredsify: (originalFunc: Function) => (params: any, options: any, callback: any) => Promise<any>;
export declare const awsCredsifyAll: (object: Client, isNested?: boolean) => Client;
export declare const awsGetCredentials: () => Promise<AWS.Credentials>;
export {};
