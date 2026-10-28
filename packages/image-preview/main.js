// Предпросмотр картинок: BBForge спрашивает только про адреса с доменов из разрешений network:…
exports.preview = async (bb, { url }) => {
  const image = await bb.http.get(url, { as: "dataUrl" });
  return image.status === 200 ? image.dataUrl : null;
};
