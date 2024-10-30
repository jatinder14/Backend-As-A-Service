const { sendEmail } = require('../services/emailService');
const { EMAIL_SUBJECTS, EMAIL_MESSAGES } = require('../constants/message');

const sendTaskEmail = async (users, task, action) => {
    const emailPromises = users.map((user) => {
        let subject, text;

        switch (action) {
            case 'created':
                subject = `${EMAIL_SUBJECTS.TASK_CREATED} ${task.title}`;
                text = `${EMAIL_MESSAGES.TASK_CREATED} ${task.description}. ${EMAIL_MESSAGES.DUE_DATE} ${task.dueDate}`;
                break;
            case 'assigned':
                subject = `${EMAIL_SUBJECTS.TASK_ASSIGNED} ${task.title}`;
                text = `${EMAIL_MESSAGES.TASK_ASSIGNED} ${task.description}. ${EMAIL_MESSAGES.DUE_DATE} ${task.dueDate}`;
                break;
            case 'updated':
                subject = `${EMAIL_SUBJECTS.TASK_UPDATED} ${task.title}`;
                text = `${EMAIL_MESSAGES.TASK_UPDATED_USER} ${task.description}. ${EMAIL_MESSAGES.DUE_DATE} ${task.dueDate}`;
                break;
            case 'deleted':
                subject = `${EMAIL_SUBJECTS.TASK_DELETED} ${task.title}`;
                text = `${EMAIL_MESSAGES.TASK_DELETED} ${task.description}. ${EMAIL_MESSAGES.DUE_DATE} ${task.dueDate}`;
                break;
            default:
                throw new Error('Invalid email action');
        }

        return sendEmail(user.email, subject, text);
    });

    return Promise.all(emailPromises);
};

module.exports = { sendTaskEmail };
