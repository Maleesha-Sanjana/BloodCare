/* Sri Lanka district centers + request coordinate helpers */
const DISTRICT_COORDS = {
  Colombo:      [6.9271, 79.8612],
  Gampaha:      [7.0917, 79.9997],
  Kalutara:     [6.5854, 79.9607],
  Kandy:        [7.2906, 80.6337],
  Matale:       [7.4675, 80.6234],
  'Nuwara Eliya': [6.9497, 80.7891],
  Galle:        [6.0329, 80.2170],
  Matara:       [5.9549, 80.5550],
  Hambantota:   [6.1241, 81.1185],
  Jaffna:       [9.6615, 80.0255],
  Kilinochchi:  [9.3803, 80.3760],
  Mannar:       [8.9810, 79.9044],
  Vavuniya:     [8.7514, 80.4971],
  Mullaitivu:   [9.2671, 80.8142],
  Batticaloa:   [7.7310, 81.6747],
  Ampara:       [7.2976, 81.6728],
  Trincomalee:  [8.5874, 81.2152],
  Kurunegala:   [7.4863, 80.3623],
  Puttalam:     [8.0362, 79.8283],
  Anuradhapura: [8.3114, 80.4037],
  Polonnaruwa:  [7.8731, 81.0039],
  Badulla:      [6.9934, 81.0550],
  Monaragala:   [6.8728, 81.3507],
  Ratnapura:    [6.6828, 80.4037],
  Kegalle:      [7.2513, 80.3464],
};

const LEVEL_COLORS = {
  critical: '#c0392b',
  urgent:   '#e67e22',
  normal:   '#27ae60',
};

function getRequestCoords(req) {
  const lat = parseFloat(req.lat);
  const lng = parseFloat(req.lng);
  if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  const district = DISTRICT_COORDS[req.location];
  if (district) return district;
  return [7.8731, 80.7718]; // Sri Lanka center fallback
}

function hasGpsCoords(req) {
  const lat = parseFloat(req.lat);
  const lng = parseFloat(req.lng);
  return !isNaN(lat) && !isNaN(lng);
}

window.DISTRICT_COORDS = DISTRICT_COORDS;
window.getRequestCoords = getRequestCoords;
window.hasGpsCoords = hasGpsCoords;
window.REQUEST_LEVEL_COLORS = LEVEL_COLORS;
