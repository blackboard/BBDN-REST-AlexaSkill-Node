/* eslint-disable func-names */
/* eslint-disable no-console */
const axios = require('axios');
const moment = require('moment-timezone');

//
// LEARN REST API ACCESS
//
const bbClient = (bearerToken) => {
  const client = axios.create({
    baseURL: 'https://devconapidemo.hopto.org'
  });
  
  // Alter defaults after instance has been created
  client.defaults.headers.common.Authorization = 'Bearer ' + bearerToken;
  client.defaults.headers.common.Accept = 'application/json';
  client.defaults.headers.post['Content-Type'] = 'application/json';

  return client;
};

const currentUser = async (accessToken) => {
  const response = await bbClient(accessToken).get('/learn/api/public/v1/users/me');
  console.log('currentUser response: ', response.data);
  return response.data;
}

const searchCalendar = async (accessToken, params) => {
  console.log('searching calendar with: ', params);
  const response = await bbClient(accessToken).get('/learn/api/public/v1/calendars/items', {
    params: params
  });
  console.log("searchCalender response: ", response.data);
  const filteredResponse = response.data.results
    .filter(event => {

      const startsAfter = (event, date) => {
        return date === undefined ? true : moment(event.start).isSameOrAfter(date);
      }
      const startsBefore = (event, date) => {
        return date === undefined ? true : moment(event.start).isSameOrBefore(date);
      }

      return startsAfter(event, params.since) && startsBefore(event, params.until);
    });
  console.log("searchCalender filteredResponse: ", filteredResponse);
  return filteredResponse;
};

const createPersonalCalendarItem = async (accessToken, calendarOptions) => {
  const postOptions = {
    'type': 'Personal',
    'calendarId': 'PERSONAL',
    'title': calendarOptions.title,
    'start': calendarOptions.start,
    'end': calendarOptions.end
  };
  
  console.log('Creating calendar item with: ', postOptions);
  const response = await bbClient(accessToken).post('/learn/api/public/v1/calendars/items', postOptions);
  console.log('createCalendarItem response: ', response.data);
  return response.data;
}

const getCourseById = async (accessToken, courseId) => {
  const response = await bbClient(accessToken).get(`/learn/api/public/v1/courses/${courseId}`);
  console.log('getCourseById response: ', response.data);
  return response.data;
}

const getCourseByName = async (accessToken, courseName) => {
  const courses = await getCourses(accessToken, {
    'name': courseName,
    'limit': 1
  });
  return courses[0];
}

const getCourses = async (accessToken, searchOptions) => {
  const response = await bbClient(accessToken).get('/learn/api/public/v1/courses', {
    params: searchOptions
  });
  console.log('getCourses: ', response.data);
  return response.data.results;
}

const getCourseMembership = async (accessToken, courseId) => {
  try {
    const response = await bbClient(accessToken).get(`/learn/api/public/v1/courses/${courseId}/users/me`);
    console.log('getCourseMembership response: ', response.data);
    return response.data;
  } catch (err) {
    // in case we get a 404
    return undefined;
  }
}

const getCurrentUserFinalGrade = async (accessToken, courseId) => {
  const response = await bbClient(accessToken).get(`/learn/api/public/v2/courses/${courseId}/gradebook/columns/finalGrade/users/me`);
  console.log('getCurrentUserFinalGrade response: ', response.data);
  return response.data;
}

const getStudentGrades = async (accessToken, courseId) => {
  const response = await bbClient(accessToken).get(`/learn/api/public/v2/courses/${courseId}/gradebook/columns/finalGrade/users`);
  console.log('getStudentGrades: ', JSON.stringify(response.data));
  return response.data.results;
}

const createAnnouncement = async (accessToken, title, body) => {
  const postOptions = {
    'title': title,
    'body': `<!-- {\"bbMLEditorVersion\":1} --><div>${body}</div>`,
  }

  console.log('Creating announcement item with: ', postOptions);
  const response = await bbClient(accessToken).post('/learn/api/public/v1/announcements', postOptions);

  console.log('createAnnouncement: ', response.data);
  return response.data;
}

var exports = module.exports;
exports.currentUser = currentUser;
exports.searchCalendar = searchCalendar;
exports.createPersonalCalendarItem = createPersonalCalendarItem;
exports.getCourseById = getCourseById;
exports.getCourseByName = getCourseByName;
exports.getCourses = getCourses;
exports.getCourseMembership = getCourseMembership;
exports.getCurrentUserFinalGrade = getCurrentUserFinalGrade;
exports.getStudentGrades = getStudentGrades;
exports.createAnnouncement = createAnnouncement;
