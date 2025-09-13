self.onmessage = async (e) => {
  const { url } = e.data;

  try {
    const res = await fetch(url);
    if (res.status === 200) {
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();
      self.postMessage(
        {
          result: arrayBuffer,
          type: blob.type,
        },
        {
          transfer: [arrayBuffer],
        }
      );
    } else {
      self.postMessage({ result: undefined });
    }
  } catch (error) {
    self.postMessage({ result: undefined });
  }
};
