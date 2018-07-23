/* eslint-disable func-names */
/* eslint-disable no-console */
const Alexa = require('ask-sdk');
const bbService = require('./bb-service');
const utils = require('./utils');
const moment = require('moment-timezone');

//
// HANDLERS
//
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const accessToken = getAccessToken(handlerInput);
    const currentUser = await bbService.currentUser(accessToken);
    return handlerInput.responseBuilder
      .speak(`Hello ${currentUser.name.given}, Welcome to the Blackboard Assistant. What can I help you with?`)
      .withAskForPermissionsConsentCard(['read::alexa:device:all:address'])
      .reprompt('For instructions on what you can say, please say help me.')
      .getResponse();
  }
};

const ReadCalendarHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.ReadAction<object@Calendar>';
  },
  async handle(handlerInput) {
    const timeZoneId = await utils.getTimeZoneId(handlerInput);

    const now = moment();
    const calendarItems = await bbService.searchCalendar(getAccessToken(handlerInput), {
      since: now.tz(timeZoneId).toISOString(),
      until: now.endOf('day').tz(timeZoneId).toISOString(),
      sort: 'start'
    });
    return readCalendarEvents(handlerInput, calendarItems);
  }
};

const SearchCalendarHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.SearchAction<object@Calendar>';
  },
  async handle(handlerInput) {
    // Amazon seems to only fill EITHER startDate OR startTime when using the built-in AMAZON.SearchAction<object@Calendar>
    const startDateSlot = handlerInput.requestEnvelope.request.intent.slots['object.event.startDate'].value;
    const startTimeSlot = handlerInput.requestEnvelope.request.intent.slots['object.startTime'].value;
    console.log(`startDate: ${startDateSlot}, startTime: ${startTimeSlot}`);

    const timeZoneId = await utils.getTimeZoneId(handlerInput);
    const startDate = startDateSlot !== undefined ? moment.tz(startDateSlot, timeZoneId) : moment().tz(timeZoneId);
    console.log('startDate: ', startDate.format());

    const calendarItems = await bbService.searchCalendar(getAccessToken(handlerInput), {
      since: startDate.startOf('day').format(),
      until: startDate.endOf('day').format(),
      sort: 'start'
    });
    return readCalendarEvents(handlerInput, calendarItems);
  }
};

const NextAssignmentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'NextAssignmentEvent';
  },
  async handle(handlerInput) {
    const timeZoneId = await utils.getTimeZoneId(handlerInput);
    const events = await bbService.searchCalendar(getAccessToken(handlerInput), {
      type: 'GradebookColumn',
      since: moment().tz(timeZoneId).toISOString(),
      sort: 'start'
    });
    let outputText;
    if (events.length == 0) {
      outputText = 'You do not have any upcoming assignments. What else can I help you with?';
    } else {
      const startTime = moment(events[0].start).tz(timeZoneId);
      outputText = `Your next assignment: ${events[0].title}, is due ${startTime.format('MMMM Do')} at ${startTime.format('hh:mm a')}. What else can I help you with?`;
    }
    return handlerInput.responseBuilder
      .speak(outputText)
      .reprompt('What else can I help you with?')
      .getResponse();
  }
};

const CreateCalendarEventHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'CreateCalendarEvent';
  },
  async handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    const requiredSlots = [
      'title',
      'startDate',
      'startTime',
      'duration'
    ];

    if (requiredSlots.every(slotFilled(currentIntent))) {
      const timeZoneId = await utils.getTimeZoneId(handlerInput);
      const startDate = moment.tz(`${currentIntent.slots.startDate.value} ${currentIntent.slots.startTime.value}`, timeZoneId);
      const endDate = startDate.clone().add(moment.duration(currentIntent.slots.duration.value));

      const calendarOptions = {
        'title': currentIntent.slots.title.value,
        'start': startDate.toISOString(),
        'end': endDate.toISOString()
      };

      await bbService.createPersonalCalendarItem(accessToken, calendarOptions);

      return handlerInput.responseBuilder
        .speak(`OK I created the event named ${currentIntent.slots.title.value}. What else can I help you with?`)
        .reprompt('What else can I help you with?')
        .getResponse();
    } else {
      // solicit more input from user
      return handlerInput.responseBuilder
        .addDelegateDirective(currentIntent)
        .getResponse();
    }
  }
};

const OpenCourseHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'OpenCourseEvent';
  },
  async handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    const requiredSlots = [
      'courseName'
    ];

    if (requiredSlots.every(slotFilled(currentIntent))) {
      const courseName = currentIntent.slots.courseName.value;
      const course = await bbService.getCourseByName(getAccessToken(handlerInput), courseName)
      if ( course !== undefined ) {
        console.log('Found course: ', course);
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.courseId = course.id;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        return handlerInput.responseBuilder
          .speak(`OK, What would you like to do with ${course.name}?`)
          .reprompt(`What would you like to do with ${course.name}?`)
          .getResponse();
      } else {
        currentIntent.slots.courseName.value = undefined;
        return handlerInput.responseBuilder
          .addDelegateDirective(currentIntent)
          .getResponse();
      }
    } else {
      // solicit more input from user
      return handlerInput.responseBuilder
        .addDelegateDirective(currentIntent)
        .getResponse();
    }
  }
};

const CurrentActiveCourseHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'CurrentActiveCourse';
  },
  async handle(handlerInput) {
    const courseId = handlerInput.attributesManager.getSessionAttributes().courseId;

    if (courseId === undefined) {
      return handlerInput.responseBuilder
        .speak('You have not selected a course. You can select a course by saying: open course, or select course.')
        .reprompt('You can select a course by saying: open course, or select course.')
        .getResponse();
    } else {
      const course = await bbService.getCourseById(getAccessToken(handlerInput), courseId);
      return handlerInput.responseBuilder
        .speak(`The active course is: ${course.name}. What else can I help you with?`)
        .reprompt('What else can I help you with?')
        .getResponse();
    }
  }
};

const CurrentGradeHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'CurrentGrade'
            && handlerInput.attributesManager.getSessionAttributes().courseId !== undefined;
  },
  async handle(handlerInput) {
    const accessToken = getAccessToken(handlerInput);
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    const [course, courseMembership] = await Promise.all([
      bbService.getCourseById(accessToken, sessionAttributes.courseId),
      bbService.getCourseMembership(accessToken, sessionAttributes.courseId)
    ]);

    if (courseMembership === undefined) {
      return handlerInput.responseBuilder
        .speak(`You are not enrolled in ${course.name}.`)
        .reprompt('What else can I help you with?')
        .getResponse();
    } else if (courseMembership.courseRoleId !== 'Student') {
      return handlerInput.responseBuilder
        .speak(`You are not a student in ${course.name}. What else can I help you with?`)
        .reprompt('What else can I help you with?')
        .getResponse();
    } else {
      const studentGrade = await bbService.getCurrentUserFinalGrade(accessToken, sessionAttributes.courseId);
      return handlerInput.responseBuilder
        .speak(`Your grade for ${course.name} is: ${studentGrade.displayGrade.text}. What else can I help you with?`)
        .reprompt('What else can I help you with?')
        .getResponse();
    }
  }
};

const ShowBellCurveHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'ShowGrades'
            && handlerInput.attributesManager.getSessionAttributes().courseId !== undefined;
  },
  async handle(handlerInput) {
    const accessToken = getAccessToken(handlerInput);
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    const [course, courseMembership] = await Promise.all([
      bbService.getCourseById(accessToken, sessionAttributes.courseId),
      bbService.getCourseMembership(accessToken, sessionAttributes.courseId)
    ]);

    if (courseMembership === undefined || courseMembership.courseRoleId !== 'Instructor') {
      return handlerInput.responseBuilder
        .speak(`You are not an instructor for ${course.name}. What else can I help you with?`)
        .reprompt('What else can I help you with?')
        .getResponse();
    } else {
      const studentGrades = await bbService.getStudentGrades(accessToken, sessionAttributes.courseId);
      const data = studentGrades
        .filter( grade => grade.displayGrade !== undefined )
        .map( grade => grade.displayGrade.score );
  
      const bellCurveUrl = await utils.generateBellCurve(course.name, data);
      return handlerInput.responseBuilder
        .speak('I\'ve sent the bell curve to your Alexa app. What else can I help you with?')
        .reprompt('What else can I help you with?')
        .withStandardCard('Bell Curve', 'Here is the data requested:', bellCurveUrl)
        .getResponse();
    }
  }
};

const PublishBellCurveHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'PublishGrades'
            && handlerInput.attributesManager.getSessionAttributes().courseId !== undefined;
  },
  async handle(handlerInput) {
    const accessToken = getAccessToken(handlerInput);
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    const [course, courseMembership] = await Promise.all([
      bbService.getCourseById(accessToken, sessionAttributes.courseId),
      bbService.getCourseMembership(accessToken, sessionAttributes.courseId)
    ]);

    if (courseMembership === undefined || courseMembership.courseRoleId !== 'Instructor') {
      return handlerInput.responseBuilder
        .speak(`You are not an instructor for ${course.name}. What else can I help you with?`)
        .reprompt('What else can I help you with?')
        .getResponse();
    } else {
      const studentGrades = await bbService.getStudentGrades(accessToken, sessionAttributes.courseId);
      const data = studentGrades
        .filter( grade => grade.displayGrade !== undefined )
        .map( grade => grade.displayGrade.score );

      const bellCurveUrl = await utils.generateBellCurve(course.name, data);

      await bbService.createAnnouncement(accessToken, `${course.name} Grades`, `<a href="${bellCurveUrl}"><img src="${bellCurveUrl}"/></a>`);

      return handlerInput.responseBuilder
        .speak(`I've published the student grades for ${course.name}. What else can I help you with?`)
        .reprompt('What else can I help you with?')
        .getResponse();
    }
  }
};

const SwitchUserHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'SwitchUser';
  },
  handle(handlerInput) {
    clearSession(handlerInput);

    return handlerInput.responseBuilder
      .speak('Please logout of your Learn instance then use the Alexa app to link your Amazon account with your Blackboard Account.')
      .withLinkAccountCard()
      .getResponse();
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'You can say things such as: what is on my calendar on Friday, create a calendar event, select course, or, you can say exit...Now, what can I help you with?';
    
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  }
};

const ExitHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Goodbye. Thanks for using Blackboard!')
      .getResponse();
  }
};

const RepeatHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.RepeatIntent';
  },
  handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    return handlerInput.responseBuilder
      .speak(sessionAttributes.speakOutput)
      .reprompt(sessionAttributes.repromptSpeech)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log('Session Ended: ', handlerInput)
    //any cleanup logic goes here
    clearSession(handlerInput);
    return handlerInput.responseBuilder.getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log('Error handled: ', error.message);

    if (error instanceof UnlinkedAccountException) {
      clearSession(handlerInput);
      return handlerInput.responseBuilder
        .speak('Please use the Alexa app to link your Amazon account with your Blackboard Account.')
        .withLinkAccountCard()
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak('Sorry, I encountered an error.')
        .reprompt('Sorry, I encountered an error.')
        .withShouldEndSession(false)
        .getResponse();
    }
  },
};

//
// INTERCEPTORS
//
const RequestPersistenceInterceptor = {
  async process(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    if (Object.keys(sessionAttributes).length === 0) {
      const persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes();
      handlerInput.attributesManager.setSessionAttributes(persistentAttributes);
    }
  }
}

const ResponsePersistenceInterceptor = {
  async process(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    const persistentAttributes = Object.assign({}, sessionAttributes);
    delete persistentAttributes.courseId; // do not want to persist the courseId

    handlerInput.attributesManager.setPersistentAttributes(persistentAttributes);
    await handlerInput.attributesManager.savePersistentAttributes();
  }
}

//
// HELPER FUNCTIONS
//
const slotFilled = currentIntent => slotName => currentIntent.slots[slotName].value !== undefined;

function UnlinkedAccountException(message) {
  this.message = message;
  // Use V8's native method if available, otherwise fallback
  if ("captureStackTrace" in Error) {
    Error.captureStackTrace(this, UnlinkedAccountException);
  } else {
    this.stack = (new Error()).stack;
  }
}

UnlinkedAccountException.prototype = Object.create(Error.prototype);
UnlinkedAccountException.prototype.name = "UnlinkedAccountException";
UnlinkedAccountException.prototype.constructor = UnlinkedAccountException;

const getAccessToken = handlerInput => {
  const accessToken = handlerInput.requestEnvelope.context.System.user.accessToken;
  if (accessToken === undefined) {
    throw new UnlinkedAccountException('The account is not linked');
  }
  return accessToken;
}

const clearSession = handlerInput => {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  delete sessionAttributes.courseId;
}

const readCalendarEvents = async (handlerInput, events) => {
  const timeZoneId = await utils.getTimeZoneId(handlerInput);

  let outputText;
  if (events.length == 0) {
    outputText = 'You do not have any calendar events.';
  } else {
    outputText = 'Here are the events you requested. ';
    events.forEach( event => {
      outputText += `At ${moment(event.start).tz(timeZoneId).format('hh:mm a')}. The title is: ${event.title}. <break strength="strong"/>`;
    });
  }
  return handlerInput.responseBuilder
    .speak(outputText + ' What else can I help you with?')
    .reprompt('What else can I help you with?')
    .getResponse();
};

//
// ALEXA SKILL LAMBDA
//
exports.handler = Alexa.SkillBuilders.standard()
  .addRequestHandlers(
    LaunchRequestHandler,
    ReadCalendarHandler,
    SearchCalendarHandler,
    CreateCalendarEventHandler,
    NextAssignmentHandler,
    OpenCourseHandler,
    CurrentActiveCourseHandler,
    CurrentGradeHandler,
    ShowBellCurveHandler,
    PublishBellCurveHandler,
    SwitchUserHandler,
    HelpIntentHandler,
    RepeatHandler,
    ExitHandler,
    SessionEndedRequestHandler)
  .addErrorHandlers(ErrorHandler)
  .addRequestInterceptors(RequestPersistenceInterceptor)
  .addResponseInterceptors(ResponsePersistenceInterceptor)
  .withAutoCreateTable(true)
  .withTableName('blackboardAssistantData')
  .lambda();
