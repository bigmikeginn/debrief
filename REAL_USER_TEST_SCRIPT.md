# Debrief Wizard Real-User Test Script

Use this with 2-3 non-technical testers. The goal is to learn where they hesitate, get confused, or feel intimidated.

## What You Need

- The local wizard open in a browser
- A blank note doc to record observations
- One tester at a time
- Ideally one tester with a Google account and one tester without
- Ideally one tester with Telegram and one tester without

## Important Rule

Do not help too early.

Let the tester think out loud and try to complete each step naturally. Only help if they are fully stuck for more than 60-90 seconds.

## What To Say At The Start

Read this aloud:

"I’m testing whether this setup wizard is easy to use. I’m not testing you. Please say out loud what you think each step means, what feels clear, and what feels confusing."

## Test Goals

Watch for these things:

1. Do they understand what the wizard is for within 10-15 seconds?
2. Do they know what to type into each field without asking?
3. Do they notice that some steps can be skipped for now?
4. Do the hidden API key and token fields feel safer and less intimidating?
5. Can they understand the final results screen without reading technical details?

## Suggested Test Tasks

Ask the tester to complete these tasks in order:

1. Open the wizard and explain what they think it does.
2. Fill in the first step using their own club or a pretend club.
3. Continue to the Google step and explain what they think they should do next.
4. Continue to the Telegram step and explain what they think the bot token is.
5. Continue without filling every optional field.
6. Reach the final results screen and explain what they would do next in real life.
7. Only after that, ask them to open "Show technical details" and tell you whether it feels optional or scary.

## What To Record

For each tester, write down:

- Where they paused
- Which words confused them
- Which field felt intimidating
- Whether they noticed "skip for now"
- Whether they understood the final next steps
- Whether they felt confident they could finish the setup

## High-Value Questions To Ask Afterward

Ask these after they finish:

1. What part felt easiest?
2. What part felt most confusing?
3. Was there any field you did not want to touch?
4. Did the hidden fields make you feel better or more confused?
5. If you were doing this alone, where would you stop and ask for help?
6. What would make this feel even simpler?

## Success Criteria

The wizard is in good shape if most testers:

- Understand the purpose quickly
- Complete the first three steps without explanation
- Realize some fields can be skipped
- Do not panic when they see API key or bot token fields
- Understand what to do from the results screen

## Red Flags

You should revise the wizard if testers:

- Ask what the wizard is for
- Freeze when they see Sheet URL, bot token, or Claude API key
- Think they must complete every field before continuing
- Ignore the final next steps
- Feel the technical details are too prominent

## Recommended Testing Order

1. First run: watch silently and only take notes
2. Second run: confirm the same friction points appear again
3. Third run: test after small wording improvements

## Fast Internal Test Before Real Users

Before using real testers, do one quick dry run yourself:

1. Leave Sheet URL blank
2. Leave Bot token blank
3. Leave Claude API key blank
4. Complete the wizard
5. Check that the summary shows "Skip for now"
6. Check that technical details stay collapsed by default
7. Check that the next steps still make sense

