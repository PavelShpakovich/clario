import messages from './messages/ru.json';

export { messages };
export type Messages = typeof messages;
export type Namespace = keyof Messages;
