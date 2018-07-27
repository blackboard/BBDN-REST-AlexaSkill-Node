# Build An Alexa Blackbaord Assistant

### Project at a Glance:

* Blackboard Learn 3400.9.0 (soon to be released) minimum
  * An Amazon EC2 AMI Instance can be found in the AWS Marketplace [Blackboard Learn for REST and LTI Developers](https://aws.amazon.com/marketplace/pp/B077T4SX2B)
  * [Using the Blackboard Learn AMI for REST and LTI Development](https://community.blackboard.com/docs/DOC-4242-using-the-developer-ami)
* Version: Beta  v1.0b20101128
* Tested on 3400.9.0
* Languages: Javascript ES8 / Node.js
* Requirements:
  * AWS Account
  * Pulumi account (if deploying Lambda function that way)
  * Blackboard Learn instance with 3400.9.0 (soon to be released) or greater (to support Calendar APIs)
  * REST API created via Blackboard Developer Portal and registered with your Learn instance.

#### TL;DR Description:
This project serves as a functional starting point for an Alexa Skill that uses the Calendar APIs introduced in 3400.9.0 as well as some of the gradebook V2 APIs. This post assumes you have some familiarity with JavaScript/Node.js (or a similar programming language).

## Get Started

#### 1. Voice User Interface

1.  **Go to the [Amazon Alexa Developer Portal](http://developer.amazon.com/alexa).  In the top-right corner of the screen, click the "Sign In" button.**
(If you don't already have an account, you will be able to create a new one for free.)

2.  Once you have signed in, move your mouse over the **Developer Console** text at the top of the screen and Select the **Skills** Link.

3.  From the **Alexa Skills Console** select the **Create Skill** button near the top-right of the list of your Alexa Skills.

4. Give your new skill a **Name**. This is the name that will be shown in the Alexa Skills Store, and the name your users will refer to.  For the sake of simplicity, we'll just use **English (US)**.  (You can add other languages later.)  Push Next.

5. Select the **Custom** model button to add it to your skill, and select the **Create Skill** button at the top right.

6. **Build the Interaction Model for your skill**
	1. On the left hand navigation panel, select the **JSON Editor** tab under **Interaction Model**. In the textfield provided, replace any existing code with the code provided in the [Interaction Model](./alexa/models/en-US.json).  Click **Save Model**.
    2. If you want to change the skill invocation name, select the **Invocation** tab. Enter a **Skill Invocation Name**. This is the name that your users will need to say to start your skill.  In this case, it's preconfigured to be 'Hello World'.
    3. Click "Build Model".

	**Note:** You should notice that **Intents** and **Slot Types** will auto populate based on the JSON Interaction Model that you have now applied to your skill. Feel free to explore the changes here, to learn about **Intents**, **Slots**, and **Utterances**.

7. **Optional:** Select an intent by expanding the **Intents** from the left side navigation panel. Add some more sample utterances for your newly generated intents. Think of all the different ways that a user could request to make a specific intent happen. A few examples are provided. Be sure to click **Save Model** and **Build Model** after you're done making changes here.

8. If your interaction model builds successfully, proceed to the next step. If not, you should see an error. Try to resolve the errors. In our next step of this guide, we will be creating our Lambda function in the AWS developer console, but keep this browser tab open, because we will be returning here in step 3.


     If you get an error from your interaction model, check through this list:

     *  **Did you copy & paste the provided code correctly?**
     *  **Did you accidentally add any characters to the Interaction Model?**

     
#### 2. Setting Up A Lambda Function Using Amazon Web Services

First, you will need to update the code to point at your Blackboard Learn instance: Modify the URL inside: [./alexa/bb-service.js](./alexa/bb-service.js)

In this example we use [Pulumi](https://pulumi.io/) to provision our AWS Lambda Function that services our Alexa skill. Follow the instructions on Pulumi's website to [install](https://pulumi.io/install/) and setup your [AWS credentials](https://pulumi.io/install/aws.html) and deploy this project. The output after successfully running `pulumi update` will look something like: 

```
---outputs:---
alexaSkillLambdaUrn: "arn:aws:lambda:us-east-1:11111111111:function:blackboard-api-demo-alexa-skill-xxxxxxx"
```

#### 3. Connecting Your Voice User Interface To Your Lambda Function

We need to connect the voice user interface and Lambda function together.

1.  **Go back to the [Amazon Developer Portal](https://developer.amazon.com/alexa/console/ask) and select your skill from the list.** You may still have a browser tab open if you started at the beginning of this tutorial.

2. Select the **Endpoint** tab on the left side navigation panel.

3.  **Select the "AWS Lambda ARN" option for your endpoint.** You have the ability to host your code anywhere that you would like, but for the purposes of simplicity and frugality, we are using AWS Lambda. ([Read more about Hosting Your Own Custom Skill Web Service](https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/developing-an-alexa-skill-as-a-web-service))

4.  Paste your Lambda's ARN (Amazon Resource Name) into the textbox provided for **Default Region**.

5. Click the **Save Endpoints** button at the top of the main panel.


#### 4. Setup OAuth Account Linking

We need to setup the OAuth2.0 account linking with your Learn instance

1.  **Go back to the [Amazon Developer Portal](https://developer.amazon.com/alexa/console/ask) and select your skill from the list.** You may still have a browser tab open if you started at the beginning of this tutorial.

2. Select the **Account Linking** tab on the left side navigation panel.

3. Enable the account link toggle

4.  **Select the "Auth Code Grant" option.**

5. Enter Authorization URI: **https://YOUR_DOMAIN/learn/api/public/v1/oauth2/authorizationcode**

6. Access Token URI: **https://YOUR_DOMAIN/learn/api/public/v1/oauth2/token**

7. Client ID: **YOUR REST API APPLICATION ID** (from the [Blackboard Developer Portal](https://developer.blackboard.com))

8. Client Secret: **YOUR REST API APPLICATION SECRET** (from the [Blackboard Developer Portal](https://developer.blackboard.com))

9. Scope: *

10. Domain List: **YOUR_DOMAIN**

11. Click the **Save** button at the top of the main panel.

> Note: Don't forget to add your REST API application in your Learn instance Administration Panel.

## Additional Resources

### Community
* [Amazon Developer Forums](https://forums.developer.amazon.com/spaces/165/index.html) - Join the conversation!
* [Hackster.io](https://www.hackster.io/amazon-alexa) - See what others are building with Alexa.
* [Official Blackboard Community](https://community.blackboard.com/) - Official Blackboard Community

### Tutorials & Guides
* [Voice Design Guide](https://developer.amazon.com/designing-for-voice/) - A great resource for learning conversational and voice user interface design.
* [Codecademy: Learn Alexa](https://www.codecademy.com/learn/learn-alexa) - Learn how to build an Alexa Skill from within your browser with this beginner friendly tutorial on Codecademy!

### Documentation
* [Official Alexa Skills Kit Node.js SDK](https://www.npmjs.com/package/ask-sdk) - The Official Node.js SDK Documentation
* [Official Alexa Skills Kit Documentation](https://developer.amazon.com/docs/ask-overviews/build-skills-with-the-alexa-skills-kit.html) - Official Alexa Skills Kit Documentation
* [Official Blackboard Developer Portal](https://developer.blackboard.com) - Official Blackboard Developer Portal
* [Pulumi](https://pulumi.io/) - Pulumi provides a Cloud Programming Model