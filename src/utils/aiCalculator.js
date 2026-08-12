const getOpenAIClient = require('../config/openaiClient');
const { OPENAI_VISION_MODEL } = require('../config/aiConfig');

/**
 * Calculates the exact Eco Points and CO2 Saved using OpenAI.
 * @param {string} category - The category of the waste
 * @param {number} kgQty - The quantity in kilograms
 * @param {string} description - The user description of the waste
 * @returns {Promise<{ pointsEarned: number, co2Saved: number }>}
 */
const calculateWasteImpact = async (category, kgQty, description) => {
  const systemPrompt = `You are an environmental impact calculator.
Given a specific waste item's category, description, and weight (in kg), calculate two things:
1. "pointsEarned": Eco points awarded (integer). Generally, higher impact/harder to recycle items like e-waste get more points (~10 pts/kg), plastics (~5 pts/kg), organics (~3 pts/kg). Adjust dynamically based on the description (e.g. if the item is very hazardous or rare, give slightly more points).
2. "co2Saved": CO2 emissions saved by recycling/composting this instead of landfilling it (in kg). E-waste/metals save a lot (~1.8-2.0 kg CO2 per kg), plastics (~1.5), paper (~0.9), organic (~0.5).

Return EXACTLY a JSON object matching this schema, with no markdown formatting:
{
  "pointsEarned": <integer>,
  "co2Saved": <float>
}
`;

  const userPrompt = `Waste Category: ${category}
Description: ${description || 'No description provided'}
Weight: ${kgQty} kg

Calculate the pointsEarned and co2Saved for this specific amount of waste.`;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: OPENAI_VISION_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    return {
      pointsEarned: Math.max(0, Math.round(result.pointsEarned || 0)),
      co2Saved: Math.max(0, Number(result.co2Saved || 0))
    };
  } catch (error) {
    console.error('AI Calculation error:', error);
    // Absolute baseline fallback just in case the API goes down
    return {
      pointsEarned: Math.max(1, Math.round(kgQty * 2)), 
      co2Saved: Math.max(0, kgQty * 0.3)
    };
  }
};

module.exports = { calculateWasteImpact };
