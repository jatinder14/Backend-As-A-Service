const EMAIL_SUBJECTS = {
  TASK_CREATED: 'New Task Created:',
  TASK_ASSIGNED: 'New Task Assigned:',
  TASK_UPDATED: 'Task UPDATED SUCCESSFULLY!',
  TASK_DELETED: 'Task DELETED SUCCESSFULLY!',
};

const EMAIL_MESSAGES = {
  HI: 'Hi',
  DUE_DATE: 'Due Date:',
  TASK_ASSIGNED: 'You have been assigned a new task:',
  TASK_CREATED: 'You have created a new task:',
  TASK_UPDATED: 'The task has been updated:',
  TASK_UPDATED_USER: 'A task assigned to you has been updated:',
  TASK_DELETED: 'Task DELETED SUCCESSFULLY!',
};

module.exports = { EMAIL_SUBJECTS, EMAIL_MESSAGES };
