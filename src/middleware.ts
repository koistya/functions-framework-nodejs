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
import {Request, Response, NextFunction} from 'express';

const PUBSUB_EVENT_TYPE = 'google.pubsub.topic.publish';
const PUBSUB_MESSAGE_TYPE =
  'type.googleapis.com/google.pubsub.v1.PubsubMessage';
const PUBSUB_SERVICE = 'pubsub.googleapis.com';

interface RawPubSubBody {
  subscription: string;
  message: {
    data: string;
    messageId: string;
    attributes: {[key: string]: string};
  };
}

interface PubSubEventBody {
  context: {
    eventId: string;
    timestamp: string;
    eventType: typeof PUBSUB_EVENT_TYPE;
    resource: {
      service: typeof PUBSUB_SERVICE;
      type: typeof PUBSUB_MESSAGE_TYPE;
      name: string;
    };
  };
  data: {
    '@type': typeof PUBSUB_MESSAGE_TYPE;
    data: string;
    attributes: {[key: string]: string};
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isRawPubSubBody = (body: any): body is RawPubSubBody => {
  /* eslint-disable eqeqeq */
  return (
    body != null &&
    body.subscription != null &&
    body.message != null &&
    body.message.data != null &&
    body.message.messageId != null
  );
  /* eslint-enable eqeqeq */
};

const extractTopic = (path: string): string => {
  const parsedTopic = path.match(/projects\/[^\\^?]+\/topics\/[^\\^?]+/);
  if (parsedTopic) {
    return parsedTopic[0];
  }
  console.warn('Failed to extract the topic name from the URL path.');
  console.warn(
    "Configure your subscription's push endpoint to use the following path: ",
    'projects/PROJECT_NAME/topics/TOPIC_NAME'
  );
  return '';
};

const marshalPubSubRequest = (
  body: RawPubSubBody,
  path: string
): PubSubEventBody => ({
  context: {
    eventId: body.message.messageId,
    timestamp: new Date().toISOString(),
    eventType: PUBSUB_EVENT_TYPE,
    resource: {
      service: PUBSUB_SERVICE,
      type: PUBSUB_MESSAGE_TYPE,
      name: extractTopic(path),
    },
  },
  data: {
    '@type': PUBSUB_MESSAGE_TYPE,
    data: body.message.data,
    attributes: body.message.attributes,
  },
});

export const pubSubEmulatorMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {body} = req;
  if (isRawPubSubBody(body)) {
    req.body = marshalPubSubRequest(req.body, req.path);
  }
  next();
};
