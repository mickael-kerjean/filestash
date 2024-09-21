/**
 * @class L.Draw.CircleMarker
 * @aka Draw.CircleMarker
 * @inherits L.Draw.Marker
 */
L.Draw.CircleMarker = L.Draw.Marker.extend({
	statics: {
		TYPE: 'circlemarker'
	},

	options: {
		stroke: true,
		color: '#3388ff',
		weight: 4,
		opacity: 0.5,
		fill: true,
		fillColor: null, //same as color by default
		fillOpacity: 0.2,
		clickable: true,
		zIndexOffset: 2000 // This should be > than the highest z-index any markers
	},

	// @method initialize(): void
	initialize: function (map, options) {
		// Save the type so super can fire, need to do this as cannot do this.TYPE :(
		this.type = L.Draw.CircleMarker.TYPE;

		this._initialLabelText = L.drawLocal.draw.handlers.circlemarker.tooltip.start;

		L.Draw.Feature.prototype.initialize.call(this, map, options);
	},


	_fireCreatedEvent: function () {
		var circleMarker = new L.CircleMarker(this._marker.getLatLng(), this.options);
		L.Draw.Feature.prototype._fireCreatedEvent.call(this, circleMarker);
	},

	_createMarker: function (latlng) {
		return new L.CircleMarker(latlng, this.options);
	}
});
