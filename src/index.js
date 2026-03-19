import { getCurrentEvent } from './calendar.js';
import { updateBoard } from './vestaboard.js';
import { resolveDynamicContent } from './content-providers/index.js';

export default {
  async scheduled(event, env, ctx) {
    console.log('=== Scheduled calendar check starting ===');
    console.log('Cron trigger:', event.cron);

    const config = {
      ICS_CALENDAR_URL: env.ICS_CALENDAR_URL,
      VESTABOARD_API_KEY: env.VESTABOARD_API_KEY,
      OPENWEATHER_API_KEY: env.OPENWEATHER_API_KEY,
      OPENWEATHER_LAT: env.OPENWEATHER_LAT,
      OPENWEATHER_LON: env.OPENWEATHER_LON,
      STATE_STORAGE_PATH: env.STATE_STORAGE_PATH || './vestaboard-state.json',
      TIMEZONE: env.TIMEZONE || 'America/Chicago',
    };

    console.log('Config check:', {
      hasIcsUrl: !!config.ICS_CALENDAR_URL,
      hasApiKey: !!config.VESTABOARD_API_KEY,
      icsUrlPrefix: config.ICS_CALENDAR_URL?.substring(0, 30) + '...',
    });

    try {
      const currentEvent = await getCurrentEvent(config.ICS_CALENDAR_URL);

      if (currentEvent) {
        console.log('Event found:', {
          summary: JSON.stringify(currentEvent.summary),
          description: JSON.stringify(currentEvent.description),
          summaryLength: currentEvent.summary?.length,
          summaryCharCodes: [...(currentEvent.summary || '')].map(c => c.charCodeAt(0)),
          start: currentEvent.start,
          end: currentEvent.end,
          isRecurring: currentEvent.isRecurring,
        });

        // Check summary (title) for content provider keywords first,
        // then fall back to description or raw summary for display
        console.log('Calling resolveDynamicContent with summary:', JSON.stringify(currentEvent.summary));
        let resolvedMessage = await resolveDynamicContent(currentEvent.summary, config);
        console.log('resolveDynamicContent returned:', typeof resolvedMessage, JSON.stringify(resolvedMessage)?.substring(0, 200));

        const summaryWasKeyword = resolvedMessage !== currentEvent.summary;
        console.log('Summary was keyword match:', summaryWasKeyword);

        if (!summaryWasKeyword && currentEvent.description) {
          console.log('Summary not a keyword, using description as display text');
          resolvedMessage = currentEvent.description;
        }

        if (typeof resolvedMessage === 'object' && resolvedMessage.skipBoardUpdate) {
          const action = resolvedMessage.action;
          if (resolvedMessage.error) {
            console.error(`${action.toUpperCase()} command failed:`, resolvedMessage.error);
            return;
          }
          console.log(`${action.toUpperCase()} command completed successfully`);
          return;
        }

        console.log('Sending to updateBoard:', typeof resolvedMessage, JSON.stringify(resolvedMessage)?.substring(0, 200));
        const updateResult = await updateBoard(resolvedMessage, config.VESTABOARD_API_KEY);
        console.log('updateBoard result:', JSON.stringify(updateResult));

        if (!updateResult.success) {
          console.error('Failed to update Vestaboard:', updateResult.error);
          return;
        }

        console.log('=== Calendar check finished. Board updated for event:', currentEvent.summary, '===');
      } else {
        console.log('=== No current event found. Calendar check finished. ===');
      }
    } catch (error) {
      console.error('=== Error during calendar check ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
};
