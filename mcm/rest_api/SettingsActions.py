from rest_api.RestAPIMethod import RESTResource
from json import dumps, loads
from couchdb_layer.mcm_database import database
from json_layer.setting import setting
from tools.settings import settings
import cherrypy

class GetSetting(RESTResource):
    def __init__(self):
        self.access_limit = 3

    def GET(self, *args):
        """
        Retrieve dictionary regarding given setting
        """
        if not args:
            self.logger.error('No arguments were given')
            return dumps({"results": {}})
        return self.get_setting(args[0])

    def get_setting(self, data):
        db = database('settings')
        if not db.document_exists(data):
            return dumps({"results": {}})
        setting = db.get(prepid=data)

        return dumps({"results": setting})

class SaveSetting(RESTResource):
    def __init__(self):
        self.access_limit = 4

    def PUT(self):
        """
        Save a new setting
        """
        try:
            res = self.update(cherrypy.request.body.read().strip())
            return res
        except:
            self.logger.error('Failed to update a setting from API')
            return dumps({'results': False, 'message': 'Failed to update a setting from API'})

    def update(self, body):
        data = loads(body)
        db = database('settings')
        if '_rev' in data:
            return dumps({"results": False, 'message': 'could save an object with revision'})

        if '_id' in data and db.document_exists(data['_id']):
            return dumps({"results": False, 'message': 'setting %s already exists.'% ( data['_id'])})
        if 'prepid' in data and db.document_exists(data['prepid']):
            return dumps({"results": False, 'message': 'setting %s already exists.'% ( data['prepid'])})

        if not 'prepid' in data and not '_id' in data:
            return dumps({"results": False, 'message': 'could save an object with no name'})

        new_setting = setting(data)

        return dumps({"results": settings().add(new_setting.get_attribute('prepid'), new_setting.json())})


class UpdateSetting(RESTResource):
    def __init__(self):
        self.access_limit = 4

    def PUT(self):
        """
        Updating an existing setting with an updated dictionary
        """
        try:
            res = self.update(cherrypy.request.body.read().strip())
            return res
        except:
            self.logger.error('Failed to update a setting from API')
            return dumps({'results': False, 'message': 'Failed to update a setting from API'})

    def update(self, body):
        data = loads(body)
        db = database('settings')
        if '_rev' not in data:
            self.logger.error('Could not locate the CouchDB revision number in object: %s' % data)
            return dumps({"results": False, 'message': 'could not locate revision number in the object'})

        if not db.document_exists(data['_id']):
            return dumps({"results": False, 'message': 'mccm %s does not exist' % ( data['_id'])})
        else:
            if db.get(data['_id'])['_rev'] != data['_rev']:
                return dumps({"results": False, 'message': 'revision clash'})

        new_version = setting(json_input=data)

        if not new_version.get_attribute('prepid') and not new_version.get_attribute('_id'):
            self.logger.error('Prepid returned was None')
            raise ValueError('Prepid returned was None')

        ## operate a check on whether it can be changed
        previous_version = setting(db.get(new_version.get_attribute('prepid')))
        editable = previous_version.get_editable()
        for (key, right) in editable.items():
            # does not need to inspect the ones that can be edited
            if right: continue
            if previous_version.get_attribute(key) != new_version.get_attribute(key):
                self.logger.error('Illegal change of parameter, %s: %s vs %s : %s' % (
                    key, previous_version.get_attribute(key), new_version.get_attribute(key), right))
                return dumps({"results": False, 'message': 'Illegal change of parameter %s' % key})

        self.logger.log('Updating setting %s...' % (new_version.get_attribute('prepid')))
        return dumps({"results": settings().set(new_version.get_attribute('prepid'), new_version.json())})
