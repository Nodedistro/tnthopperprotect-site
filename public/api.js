(function () {
  const API_BASE_URL = 'https://v5t5c85n4c.execute-api.ca-central-1.amazonaws.com/api';

  function apiUrl(path) {
    return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  }

  window.TNTHopperProtectApi = Object.freeze({ API_BASE_URL, apiUrl });
})();
