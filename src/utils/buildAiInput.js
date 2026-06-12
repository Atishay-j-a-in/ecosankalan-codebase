const buildAiInput = (files, prompt) => {
  const content = [{ type: 'input_text', text: prompt }];

  files.forEach((file, index) => {
    content.push({ type: 'input_text', text: `Analyze image ${index + 1}.` });
    content.push({
      type: 'input_image',
      image_url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
    });
  });

  return [{ role: 'user', content }];
};

module.exports = { buildAiInput };
