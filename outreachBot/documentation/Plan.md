2. Build AITIM Sales telegram bot - gives leads and saves&calculates data



1. Connect claude to google sheets - MCP

2. Create telegram bot

3. Which has this sequence: if result is empty, then send it to user

ID
Company
Name
and original title of the group

then it has 3 buttons below: successful, rejected, ignored

when it clicks for successful or rejected bot will ask:
if success: Причина успеха? OR if rejection: Что привело к отказу?
and user should record voice message or respond with text

if voice message it will be processed by whisper

and depending on whats clicked it should save it in result table
and it should save reason into notes table

I have also added CompletedBy field after result and there you should save this each time: telegram id + username