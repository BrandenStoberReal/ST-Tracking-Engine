# Chat Object Structure

The `context.chat` object is an array of message objects. Each message object represents a single message in the chat
history and has the following structure:

```json
{
    "name": "string",
    "is_user": "boolean",
    "is_system": "boolean",
    "send_date": "string",
    "mes": "string",
    "extra": "object",
    "swipe_id": "number",
    "swipes": ["string"],
    "swipe_info": "array",
    "continueHistory": "array",
    "continueSwipeId": "number",
    "continueSwipe": "object"
}
```

## Properties

- `name`: The name of the sender of the message.
- `is_user`: A boolean that is `true` if the message is from the user, and `false` otherwise.
- `is_system`: A boolean that is `true` if the message is a system message.
- `send_date`: The date and time the message was sent.
- `mes`: The rendered message content as a string. This is the text displayed in the chat. Any macros in the original
  message have been replaced with their values.
- `extra`: An object containing extra data about the message.
- `swipe_id`: The index of the currently selected swipe in the `swipes` array.
- `swipes`: An array of strings, where each string is a different version of the message. These strings may contain
  macros like `{{char}}`, `{{user}}`, `{{char_topwear}}`, etc. The `mes` property is the result of selecting a swipe and
  replacing the macros.
- `swipe_info`: An array containing information about the swipes.
- `continueHistory`: An array of objects representing the history of "continue" actions.
- `continueSwipeId`: The ID of the selected "continue" swipe.
- `continueSwipe`: An object representing the selected "continue" swipe.

## Example

```json
[
    {
        "name": "Amelia",
        "is_user": false,
        "is_system": false,
        "send_date": "October 10, 2025 6:07pm",
        "mes": "*{{char}} stands in the middle of the living room... She's wearing a white tank top...*",
        "extra": {},
        "swipe_id": 0,
        "swipes": [
            "*{{char}} stands in the middle of the living room... She's wearing a {{char_topwear}}...*"
        ],
        "swipe_info": [],
        "continueHistory": [],
        "continueSwipeId": 0,
        "continueSwipe": {}
    }
]
```
