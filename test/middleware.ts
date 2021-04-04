// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import * as assert from 'assert';
import {Response, Request, NextFunction} from 'express';
import {pubSubEmulatorMiddleware} from '../src/middleware';

describe('pubSubEmulatorMiddleware', () => {

   const response = {} as Response;
   const next = (() => {}) as NextFunction;

   it('should call the next function', () => {
      let called = false;
      let nextSpy = () => called = true;
      pubSubEmulatorMiddleware({} as Request, response, nextSpy as NextFunction);
      assert.strictEqual(called, true);
   });

   it('correctly marshals the request body of pubsub requests', () => {
      const request = {
         path: '/projects/FOO/topics/BAR_TOPIC',
         body: {
            subscription: 'projects/FOO/subscriptions/BAR_SUB',
            message: {
               data: 'eyJmb28iOiJiYXIifQ==',
               messageId: '1',
               attributes: {
                  test: '123'
               }
            }
         }
      };
      pubSubEmulatorMiddleware(request as Request, response, next);
      assert.deepStrictEqual(request.body, {
         data: {
            '@type': 'type.googleapis.com/google.pubsub.v1.PubsubMessage', 
            data: 'eyJmb28iOiJiYXIifQ==',
            attributes: {
               test: '123'
            }
        },
        context: {
            eventId: '1', 
            eventType: 'google.pubsub.topic.publish', 
            resource: {
               name: 'projects/FOO/topics/BAR_TOPIC', 
               service: 'pubsub.googleapis.com', 
               type: 'type.googleapis.com/google.pubsub.v1.PubsubMessage'
            },
            timestamp: new Date().toISOString(),
        }
      });
   });

   it('does not alter the request body of non-pubsub requests', () => {
      const request = {
         path: '/',
         body: {foo: 'bar'}
      };
      pubSubEmulatorMiddleware(request as Request, response, next);
      assert.deepStrictEqual(request.body, {foo: 'bar'});
   });
});