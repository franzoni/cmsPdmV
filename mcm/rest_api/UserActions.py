#!/usr/bin/env python

import cherrypy
from json import loads, dumps
from RestAPIMethod import RESTResource
from couchdb_layer.mcm_database import database
from tools.settings import settings
from json_layer.user import user

class GetUserRole(RESTResource):
    def __init__(self):
        self.authenticator.set_limit(0)

    def GET(self):
        """
		Retrieve the role (string) of the current user
		"""
        return self.get_user_role()

    def get_user_role(self):
        user = cherrypy.request.headers['ADFS-LOGIN']
        communicationLine = None
        if 'REMOTE-USER' in cherrypy.request.headers:
            communicationLine = cherrypy.request.headers['REMOTE-USER']
        role = self.authenticator.get_user_role(user, email=communicationLine)
        role_index = self.authenticator.get_roles().index(role)
        return dumps({'username': user, 'role': role, 'role_index': role_index})


class GetAllRoles(RESTResource):
    def __init__(self):
        self.authenticator.set_limit(0)

    def GET(self):
        """
		Retrieve the list of possible roles 
		"""
        return self.get_All_roles()

    def get_All_roles(self):
        role = self.authenticator.get_roles()
        return dumps(role)


class GetUserPWG(RESTResource):
    def __init__(self):
        self.db_name = 'users'
        self.db = database(self.db_name)

    def GET(self, *args):
        """
        Retrieve the pwg of the provided user
        """
        ## this could be a specific database in couch, to hold the list, with maybe some added information about whatever the group does...
        
        all_pwgs = settings().get_value('pwg')

        all_pwgs.sort()
        if len(args) == 0:
            return dumps({"results": all_pwgs})
        user_name = args[0]
        if self.db.document_exists(user_name):
            mcm_user = user(self.db.get(args[0]))
            if mcm_user.get_attribute('role') in ['production_manager', 'administrator', 'generator_convener']:
                return dumps({"results": all_pwgs})
            else:
                return dumps({"results": mcm_user.get_attribute('pwg')})
        else:
            return dumps({"results": []})


class GetAllUsers(RESTResource):
    def __init__(self):
        self.db_name = 'users'
        self.db = database(self.db_name)

    def GET(self):
        """
	    Retrieve the db content for all users
	    """
        return self.get_Users()

    def get_Users(self):
        # roles = self.authenticator.get_roles()
        return dumps({"results": self.db.get_all()})
        # return dumps("test")


class GetUser(RESTResource):
    def __init__(self):
        self.db_name = 'users'
        self.db = database(self.db_name)

    def GET(self, *args):
        """
	    Retrieve the information about a provided user
	    """
        return dumps({"results": self.db.get(args[0])})


class SaveUser(RESTResource):
    def __init__(self):
        self.db_name = 'users'
        self.db = database(self.db_name)
        self.access_limit = 3

    def PUT(self):
        """
	    Save the information about a given user
	    """
        return dumps({"results": self.db.save(loads(cherrypy.request.body.read().strip()))})


class AddRole(RESTResource):
    def __init__(self):
        self.db_name = 'users'
        self.db = database(self.db_name)
        self.authenticator.set_limit(0)
        #self.user = None

    def add_user(self):
        username = cherrypy.request.headers['ADFS-LOGIN']
        if self.db.document_exists(username):
            return dumps({"results": "User {0} already in database".format(username)})
        mcm_user = user({"_id": username,
                         "username": username,
                         "email": cherrypy.request.headers['REMOTE-USER'],
                         "role": self.authenticator.get_roles()[0],
                         "fullname": cherrypy.request.headers['ADFS-FIRSTNAME'] + " " + cherrypy.request.headers['ADFS-LASTNAME']})

        # save to db
        if not self.db.save(mcm_user.json()):
            self.logger.error('Could not save object to database')
            return dumps({"results": False})
        return dumps({"results": True})

    def GET(self):
        """
	    Add the current user to the user database if not already
	    """
        return self.add_user()


class ChangeRole(RESTResource):
    def __init__(self):
        self.db_name = 'users'
        self.db = database(self.db_name)
        self.all_roles = self.authenticator.get_roles()
        self.access_limit = 3

    def change_role(self, username, action):
        doc = user(self.db.get(username))
        current_user = user(self.db.get(cherrypy.request.headers['ADFS-LOGIN']))
        current_role = doc.get_attribute("role")
        if action == '-1':
            if current_role != 'user': #if not the lowest role -> then him lower himself
                doc.set_attribute("role",  self.all_roles[self.all_roles.index(current_role) - 1])
                self.authenticator.set_user_role(username, doc.get_attribute("role"))
                return dumps({"results": self.db.update(doc.json())})
            return dumps({"results": username + " already is user"}) #else return that hes already a user
        if action == '1':
            if current_user.get_attribute("role") != "administrator":
                return dumps({"results": "Only administrators can upgrade roles"})
            if len(self.all_roles) != self.all_roles.index(current_role) + 1: #if current role is not the top one
                doc.set_attribute("role",  self.all_roles[self.all_roles.index(current_role) + 1])
                self.authenticator.set_user_role(username, doc.get_attribute("role"))
                return dumps({"results": self.db.update(doc.json())})
            return dumps({"results": username + " already has top role"})
        return dumps({"results": "Failed to update user: " + username + " role"})

    def GET(self, *args):
        """
	Increase /1 or decrease /-1 the given user role by one unit of role
	"""
        if not args:
            self.logger.error("No Arguments were given")
            return dumps({"results": 'Error: No arguments were given'})
        return self.change_role(args[0], args[1])

class FillFullNames(RESTResource):
    def __init__(self):
        self.db = database('users')
        self.access_limit = 4

    def GET(self, *args):
        """
        Goes through database and fills full names of all the users, who have not had it filled yet
        """
        users = self.db.get_all()
        results = []
        for u_d in users:
            u = user(u_d)
            if not u.get_attribute('fullname'):
                import subprocess
                import re
                output = subprocess.Popen(["phonebook", "-t", "firstname", "-t", "surname", "--login", u.get_attribute('username')], stdout = subprocess.PIPE)
                split_out = [x for x in re.split("[^a-zA-Z0-9_\-]", output.communicate()[0]) if x and x!="-"]
                fullname = " ".join(split_out)
                u.set_attribute('fullname', fullname)
                results.append((u.get_attribute('username'), self.db.save(u.json())))
        return dumps({"results": results})
