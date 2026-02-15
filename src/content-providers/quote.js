const QUOTE_API_URL = 'https://quotes.meandmybadself.com/';

export const getQuoteContent = async () => {
  try {
    console.log('Fetching quote...');
    const response = await fetch(QUOTE_API_URL);

    if (!response.ok) {
      throw new Error(`Quote API error: ${response.status}`);
    }

    const { text, author } = await response.json();
    const message = `${text}\n\n- ${author}`;

    console.log('Quote fetched successfully');
    return message;
  } catch (error) {
    console.error('Error fetching quote:', error);
    return 'Quote currently unavailable';
  }
};
