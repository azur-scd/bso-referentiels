from flask import Flask, jsonify, abort, render_template,url_for,request,session, redirect, send_from_directory, Response, Blueprint
from flask_restful import Resource, reqparse
from flask_restful_swagger_2 import Api, swagger, Schema
from flask_json import FlaskJSON, json_response
import pandas as pd
import json
from dotenv import dotenv_values
from neomodel import (config, db, StructuredNode, StructuredRel,StringProperty, IntegerProperty, UniqueIdProperty, DateProperty, RelationshipTo, RelationshipFrom, Q, Traversal, OUTGOING, INCOMING, EITHER)
from models import *

class ReverseProxied(object):
    #Class to dynamically adapt Flask converted url of static files (/sttaic/js...) + templates html href links according to the url app path after the hostname (set in cnfig.py)
    def __init__(self, app, script_name=None, scheme=None, server=None):
        self.app = app
        self.script_name = script_name
        self.scheme = scheme
        self.server = server

    def __call__(self, environ, start_response):
        script_name = environ.get('HTTP_X_SCRIPT_NAME', '') or self.script_name
        if script_name:
            environ['SCRIPT_NAME'] = script_name
            path_info = environ['PATH_INFO']
            if path_info.startswith(script_name):
                environ['PATH_INFO'] = path_info[len(script_name):]
        scheme = environ.get('HTTP_X_SCHEME', '') or self.scheme
        if scheme:
            environ['wsgi.url_scheme'] = scheme
        server = environ.get('HTTP_X_FORWARDED_SERVER', '') or self.server
        if server:
            environ['HTTP_HOST'] = server
        return self.app(environ, start_response)

env = dotenv_values(".env")
#-----Neo4j database----- #
config.DATABASE_URL = env["NEO4J_BOLT_URL"]

app = Flask(__name__)
port = env['APP_PORT']
host = env['APP_HOST']
url_subpath = env['URL_SUBPATH']

FlaskJSON(app)
api = Api(app, title='SCD-UCA Local Domains Referentiel', api_version='0.0', api_spec_url='/api/swagger')
app.wsgi_app = ReverseProxied(app.wsgi_app, script_name=url_subpath)

@api.representation('application/json')
def output_json(data, code):
    return json_response(data_=data, status_=code)

class DeweyByClass(Resource):
    def get(self, classe):
        dewey_node = DeweyDomain.nodes.get(classe=classe)
        json_node = dewey_node.to_json()
        json_node["sub"] = [p.to_json() for p in dewey_node.dewey_has_subclass.all()]
        json_node["same_as"] = [p.to_json() for p in dewey_node.dewey_sameas_hal.all()] + [p.to_json() for p in dewey_node.dewey_sameas_bso.all()]
        return jsonify(json_node)

class DeweyById(Resource):
    def get(self, id):
        dewey_node = DeweyDomain.nodes.get(meta_id=id)
        json_node = dewey_node.to_json()
        json_node["sub"] = [p.to_json() for p in dewey_node.dewey_has_subclass.all()]
        json_node["same_as"] = [p.to_json() for p in dewey_node.dewey_sameas_hal.all()] + [p.to_json() for p in dewey_node.dewey_sameas_bso.all()]
        return jsonify(json_node)

class DeweyFlatList(Resource):
    @swagger.doc({
    })
    def get(self):
        all_dewey_nodes = DeweyDomain.nodes.all()
        return jsonify([dewey.to_json() for dewey in all_dewey_nodes])

class DeweyNestedList(Resource):
    @swagger.doc({
    })
    def get(self):
        result_list = [] #result_dict.append({"classe":x.classe,"name":x.name})
        all_dewey_nodes = DeweyDomain.nodes.all()
        for x in all_dewey_nodes:
            json_node = x.to_json()
            json_node["sub"] = [p.to_json() for p in x.dewey_has_subclass.all()]
            result_list.append(json_node)
        return jsonify(result_list)

class HalById(Resource):
    def get(self, id):
        hal_node = HalDomain.nodes.get(meta_id=id)
        json_node = hal_node.to_json()
        json_node["sub"] = [p.to_json() for p in hal_node.hal_has_subclass.all()]
        json_node["same_as"] = [p.to_json() for p in hal_node.hal_sameas_dewey.all()]
        return jsonify(json_node)
    def post(self, id):
        json_data = request.get_json(force=True)
        to_args = json_data['to']
        from_node = HalDomain.nodes.get(meta_id=id)
        to_node = DeweyDomain.nodes.get(meta_id=to_args)
        from_node.hal_sameas_dewey.connect(to_node)
        return jsonify({'msg': 'link created'})
    def delete(self,id):
        json_data = request.get_json(force=True)
        to_args = json_data['to']
        from_node = HalDomain.nodes.get(meta_id=id)
        to_node = DeweyDomain.nodes.get(meta_id=to_args)
        from_node.hal_sameas_dewey.disconnect(to_node)
        return jsonify({'msg': 'link removed'})


class HalFlatList(Resource):
    @swagger.doc({
    })
    def get(self):
        all_hal_nodes = HalDomain.nodes.all()
        return jsonify([hal.to_json() for hal in all_hal_nodes])

class HalNestedList(Resource):
    @swagger.doc({
    })
    def get(self):
        result_list = [] #result_dict.append({"classe":x.classe,"name":x.name})
        all_hal_nodes = HalDomain.nodes.all()
        for x in all_hal_nodes:
            json_node = x.to_json()
            json_node["sub"] = [p.to_json() for p in x.hal_has_subclass.all()]
            result_list.append(json_node)
        return jsonify(result_list)

class BsoById(Resource):
    def get(self, id):
        bso_node = BsoDomain.nodes.get(meta_id=id)
        json_node = bso_node.to_json()
        json_node["same_as"] = [p.to_json() for p in bso_node.bso_sameas_dewey.all()]
        return jsonify(json_node)
    def post(self, id):
        json_data = request.get_json(force=True)
        to_args = json_data['to']
        from_node = BsoDomain.nodes.get(meta_id=id)
        to_node = DeweyDomain.nodes.get(meta_id=to_args)
        from_node.bso_sameas_dewey.connect(to_node)
        return jsonify({'msg': 'link created'})
    def delete(self,id):
        json_data = request.get_json(force=True)
        to_args = json_data['to']
        from_node = BsoDomain.nodes.get(meta_id=id)
        to_node = DeweyDomain.nodes.get(meta_id=to_args)
        from_node.bso_sameas_dewey.disconnect(to_node)
        return jsonify({'msg': 'link removed'})

class BsoFlatList(Resource):
    @swagger.doc({
    })
    def get(self):
        all_bso_nodes = BsoDomain.nodes.all()
        return jsonify([bso.to_json() for bso in all_bso_nodes])

"""
Alternative methods
all_hal_nodes = HalDomain.nodes.all()
    for x in all_hal_nodes:
        nodes.append(x.to_json())
        relations_traversal = Traversal(x, HalDomain.__label__,hal_sub_definition) 
            if relations_traversal:
                for y in relations_traversal.all():
                    edges.append({"from":x.id,"to":y.id, "category": "Sub"})

class DeweyNodesAndEdges(Resource):
    def get(self):
        #Z = db.cypher_query("match (h:HalDomain)-[rel:HAS_SUBCLASS]->(h1) match(o) return collect(distinct{from:ID(h),to:ID(h1)}) as edges,collect(distinct{id:ID(o),label:o.name}) as nodes", resolve_objects=True)
        Z = db.cypher_query("match (h:HalDomain)-[rel:HAS_SUBCLASS]->(h1) match(o) with collect(distinct{from:ID(h),to:ID(h1)}) as edges,collect(distinct{id:ID(o),label:o.name}) as nodes return collect({nodes:nodes,edges:edges})", resolve_objects=True)
        return jsonify(Z[0][0][0][0][0])"""

class DeweyNodesAndEdgesSub(Resource):
    def get(self):
        nodes = []
        edges = []
        result = {}
        all_dewey_nodes = DeweyDomain.nodes.all()
        for x in all_dewey_nodes:
            nodes.append(x.to_json())
            for y in x.dewey_has_subclass.all():
                edges.append({"from":x.id,"to":y.id, "category": "Sub"})
        result["nodes"] = nodes
        result["edges"] = edges
        return jsonify(result)

class DeweyNodesAndEdgesSameas(Resource):
    def get(self):
        nodes = []
        edges = []
        result = {}
        all_dewey_nodes = DeweyDomain.nodes.all()
        for x in all_dewey_nodes:
            nodes.append(x.to_json())
            for y in x.dewey_sameas_hal.all():
                edges.append({"from":x.id,"to":y.id, "category": "Mapping"})
            for y in x.dewey_sameas_bso.all():
                edges.append({"from":x.id,"to":y.id, "category": "Mapping"})
        result["nodes"] = nodes
        result["edges"] = edges
        return jsonify(result)

class HalNodesAndEdgesSub(Resource):
    def get(self):
        nodes = []
        edges = []
        result = {}
        all_hal_nodes = HalDomain.nodes.all()
        for x in all_hal_nodes:
            nodes.append(x.to_json())
            for y in x.hal_has_subclass.all():
                edges.append({"from":x.id,"to":y.id, "category": "Sub"})
        result["nodes"] = nodes
        result["edges"] = edges
        return jsonify(result)

class HalEdgesSameas(Resource):
    def get(self):
        edges = []
        result = {}
        all_hal_nodes = HalDomain.nodes.all()
        for x in all_hal_nodes:
            for y in x.hal_sameas_dewey.all():
                edges.append({"from":x.id,"to":y.id, "category": "Mapping"})
        result["edges"] = edges
        return jsonify(result)

#Ajout d'un noeud générique fictif "bso_général" pour créer une hiérarchie dans l'affichage UI
class BsoNodesAndEdgesSub(Resource):
    def get(self):
        nodes = [{"id":10000,"meta_id":10000,"name":"bso général"}]
        edges = []
        result = {}
        all_bso_nodes = BsoDomain.nodes.all()
        for x in all_bso_nodes:
            nodes.append(x.to_json())
            edges.append({"from":10000,"to":x.id, "category": "Sub"})
        result["nodes"] = nodes
        result["edges"] = edges
        return jsonify(result)

class BsoEdgesSameas(Resource):
    def get(self):
        edges = []
        result = {}
        all_bso_nodes = BsoDomain.nodes.all()
        for x in all_bso_nodes:
            for y in x.bso_sameas_dewey.all():
                edges.append({"from":x.id,"to":y.id, "category": "Mapping"})
        result["edges"] = edges
        return jsonify(result)

class AllNodesAndEdges(Resource):
    def get(self):
        Z = db.cypher_query("match (n) optional match (n)-[rel]->(m) match(o) with collect(distinct{from:ID(n),to:ID(m),text:type(rel)}) as edges,collect(distinct{key:ID(o),text:o.name,group:labels(o)[0]}) as nodes return collect({nodes:nodes,edges:edges})", resolve_objects=True)
        return jsonify(Z[0][0][0][0][0])

       
api.add_resource(DeweyFlatList, '/api/v0/dewey_flat')
api.add_resource(DeweyNestedList, '/api/v0/dewey_nested')
api.add_resource(DeweyNodesAndEdgesSub, '/api/v0/dewey_nodes_edges_sub')
api.add_resource(DeweyNodesAndEdgesSameas, '/api/v0/dewey_nodes_edges_same_as')
api.add_resource(DeweyByClass, '/api/v0/dewey/classe/<string:classe>')
api.add_resource(DeweyById, '/api/v0/dewey/id/<int:id>')
api.add_resource(HalById, '/api/v0/hal/id/<int:id>')
api.add_resource(HalFlatList, '/api/v0/hal_flat')
api.add_resource(HalNestedList, '/api/v0/hal_nested')
api.add_resource(HalNodesAndEdgesSub, '/api/v0/hal_nodes_edges_sub')
api.add_resource(HalEdgesSameas, '/api/v0/hal_edges_same_as')
api.add_resource(BsoById, '/api/v0/bso/id/<int:id>')
api.add_resource(BsoFlatList, '/api/v0/bso_flat')
api.add_resource(BsoNodesAndEdgesSub, '/api/v0/bso_nodes_edges_sub')
api.add_resource(BsoEdgesSameas, '/api/v0/bso_edges_same_as')
api.add_resource(AllNodesAndEdges, '/api/v0/graph_nodes_edges')

#routing for pages
@app.route('/')
def home_page():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True,port=port,host=host)