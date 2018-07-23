// Import the [cloud-aws](https://docs.pulumi.com/packages/pulumi-cloud/) package
const cloud = require("@pulumi/cloud-aws");

// Alexa skill - lambda function 
const alexaSkill = new cloud.Function("blackboard-api-demo-alexa-skill", (event, context, callback) => {
  // Not a big fan of redeclaring required libraries here
  // seems to be a limitation where Pumuli needs the requires defined within the closure
  require('ask-sdk');
  require('ask-sdk-core');
  require('ask-sdk-model');
  require('axios');
  require('moment-timezone');
  require('timezoner');
  require('node-geocoder');
  require('lodash');
  require('./alexa/bb-service');
  require('./alexa/utils');

  const skill = require('./alexa/index');
  skill.handler(event, context, callback);
});

// Exports for output
exports.alexaSkillLambdaUrn = alexaSkill.lambda.arn;


//
// EXPERIMENT FOR AUTO PROVISIONING BLACKBOARD AMI INSTANCE
//

// const aws = require("@pulumi/aws");
// const awsinfra = require("@pulumi/aws-infra");

// const bbNetwork = new awsinfra.Network("bbinstance-net", {
//   numberOfAvailabilityZones: 1,
//   usePrivateSubnets: false,
// });

// // const bbInstanceSecurityGroup = new aws.ec2.SecurityGroup("bbinstance-secgrp", {
// //   ingress: [
// //       { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
// //       { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
// //       { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"] },
// //   ],
// //   vpcId: network.vpcId,
// // });

// const bbInstance = new aws.ec2.Instance("bbinstance-server", {
//   ami: "ami-8d1051f2", // AMI instance id for a given Blackboard Learn version
//   instanceType: "t2.medium", // minimum instance size
//   vpcSecurityGroupIds: bbNetwork.securityGroupIds,
//   subnetId: bbNetwork.subnetIds[0],
// });
// exports.bbInstanceIp = bbInstance.publicIp;
// exports.bbInstanceHostName = bbInstance.publicDns.apply(dns => `http://${dns}`);
