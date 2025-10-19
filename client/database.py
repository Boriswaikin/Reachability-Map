from client.extensions import db

class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    start_lat = db.Column(db.Float)
    start_lon = db.Column(db.Float)
    end_lat = db.Column(db.Float)
    end_lon = db.Column(db.Float)

class Waypoint(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey('trip.id', ondelete='CASCADE'))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    order_index = db.Column(db.Integer)