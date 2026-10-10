"""Base-game map art indices; MapDat drawing IDs are distinct from event codes."""
import struct

JAPAN_MAP_ID = 2
ROAD_RESOURCE = 12
BUILDING_RESOURCE_BASE = 26


def property_art():
    """Return every supported building type/level and its local map.mkf resource."""
    art = {f'house-{level}': 26 + JAPAN_MAP_ID * 5 + level for level in range(1, 6)}
    art['chain'] = 47
    art['facility-0-1'] = 48  # Park
    art.update({f'facility-1-{level}': 48 + level for level in range(1, 6)})
    art.update({f'facility-2-{level}': 53 + level for level in range(1, 6)})
    art['facility-3-1'] = 59  # Gas station (Web rules cap at one level)
    art.update({f'facility-4-{level}': 63 + level for level in range(1, 6)})
    return art


def map_art_plan(parsed):
    roads = [dict(nodeId=n['id'], x=n['x'], y=n['y'], sprite=f"road-{n['word22']}",
                  resource=ROAD_RESOURCE, frame=n['word22'] - 1)
             for n in parsed['nodes'] if n['word22']]
    scenery = []
    for table, resource_offset, direction_offset in [('companies', 0x20, 0x1b), ('landmarks', 0x1a, 0x18)]:
        for row in parsed[table]:
            raw = bytes.fromhex(row['rawHex'])
            resource = struct.unpack_from('<H', raw, resource_offset)[0]
            if not resource:
                continue
            resource += BUILDING_RESOURCE_BASE
            direction = (8 - raw[direction_offset]) & 7
            scenery.append(dict(x=row['x'], y=row['y'], name=row['name'],
                                sprite=f'map-{resource}-{direction}', resource=resource, frame=direction,
                                table=table, recordId=row['id']))
    directions = {f"japan:{kind}:{row['id']}": row['byte1b']
                  for table, kind in [('lands', 'land'), ('facilities', 'facility')]
                  for row in parsed[table]}
    return dict(roadTiles=roads, scenery=scenery, propertyDirections=directions)
