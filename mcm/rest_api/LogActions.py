#!/usr/bin/env python

from json import dumps
from couchdb_layer.mcm_database import database
from RestAPIMethod import RESTResource
from tools.user_management import access_rights


class ReadInjectionLog(RESTResource):
    def __init__(self):
        self.logfile = 'logs/inject.log'
        self.db_name = 'requests'

    def GET(self, *args):
        """
        Retrieves the last injection log for a given request id
        """
        if not args:
            self.logger.error('No arguments were given')
            return dumps({"results": 'Error: No arguments were given'})
        pid = args[0]
        nlines = -1
        if len(args) > 1:
            nlines = int(args[1])
        return dumps(self.read_logs(pid, nlines))

    def read_logs(self, pid, nlines):
        db = database(self.db_name)
        if not db.document_exists(pid):
            self.logger.error('Given prepid "%s" does not exist in the database.' % pid)
            return {"results": 'Error:Given prepid "%s" does not exist in the database.' % pid}

        try:
            data = open(self.logfile).read()
        except IOError as ex:
            self.logger.error('Could not access logs: "%s". Reason: %s' % (self.logfile, ex))
            return {"results": "Error: Could not access logs."}

        #important = data[data.rindex('## Logger instance retrieved'):]
        ## needs this otherwise, simultaneous submission would be truncated to the last to write ## Logger instance retrieved
        important = data[data.rindex('[%s] ## Logger instance retrieved' % (pid)):]
        if not important:
            raise ValueError('Malformed logs. Could not detect start of injection.')

        lines = filter(lambda l: pid in l, important.rsplit('\n'))

        if (nlines > 0):
            lines = lines[-nlines:]
        res = ''
        for line in lines:
            res += '%s<br>' % (line.replace('<breakline>', '<br>'))
        return res


class GetVerbosities(RESTResource):
    def __init__(self):
        self.access_limit = access_rights.user

    def GET(self, *args):
        """
        Get all the possible verbosities and currently chosen one
        """
        return dumps({"results": (self.logger.get_verbosities(), self.logger.get_verbosity())})
