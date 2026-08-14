async function getFavorites(req, res) {
  res.json({
    success: true,
    data: [],
    meta: {
      source: "client-localStorage"
    }
  });
}

module.exports = {
  getFavorites
};

