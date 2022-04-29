from dotenv import dotenv_values
from neomodel import (config, StructuredNode, StructuredRel,StringProperty, IntegerProperty, UniqueIdProperty, DateProperty, DateTimeProperty, RelationshipTo, RelationshipFrom, Q, Traversal, OUTGOING, INCOMING, EITHER)
import datetime
env = dotenv_values("./.env")
#-----Neo4j database----- #
config.DATABASE_URL = env["NEO4J_BOLT_URL"]

class SubclassRelationship(StructuredRel):
    """
    A very simple relationship between two BasePersons that simply
    records the date at which an acquaintance was established.
    """
    on_date = DateProperty(default = datetime.datetime.now)

class SameasRelationship(StructuredRel):
    """
    A very simple relationship between two BasePersons that simply
    records the date at which an acquaintance was established.
    """
    on_date = DateProperty(default = datetime.datetime.now)

class DeweyDomain(StructuredNode):
    id = UniqueIdProperty()
    meta_id = IntegerProperty(unique_index=True,required=True)
    classe =  StringProperty(unique_index=True,required=True)
    name = StringProperty(unique_index=True,required=True)
    dewey_has_subclass = RelationshipTo("DeweyDomain", "HAS_SUBCLASS", model = SubclassRelationship)
    dewey_sameas_hal = RelationshipFrom("HalDomain", "SAME_AS", model = SameasRelationship)
    dewey_sameas_bso = RelationshipFrom("BsoDomain", "SAME_AS", model = SameasRelationship)
    def to_json(self):
        return {
        "id": self.meta_id,
        "meta_id": self.meta_id,
        "classe": self.classe,
        "name": self.name,
        "group": "dewey"
      }
    def post_save(self):
        """
        The hook methods pre_save and post_save are available on StructuredRel models. They are executed when calling save on the object directly or when creating a new relationship via connect.
        """
        print(self)

dewey_all_definition = dict(node_class=DeweyDomain, direction=EITHER,
                  relation_type=None, model=None)
dewey_sub_definition = dict(node_class=DeweyDomain, direction=OUTGOING,
                  relation_type='HAS_SUBCLASS', model=SubclassRelationship)
dewey_sameas_definition = dict(node_class=DeweyDomain, direction=INCOMING,
                  relation_type='SAME_AS', model=SameasRelationship)

class BsoDomain(StructuredNode):
    id = UniqueIdProperty()
    meta_id = IntegerProperty(unique_index=True,required=True)
    name = StringProperty(unique_index=True,required=True)
    bso_sameas_dewey = RelationshipTo("DeweyDomain", "SAME_AS", model = SameasRelationship)
    def to_json(self):
        return {
        "id": self.id,
        "meta_id": self.meta_id,
        "name": self.name,
        "group": "hal"
      }

class HalDomain(StructuredNode):
    id = UniqueIdProperty()
    meta_id = IntegerProperty(unique_index=True,required=True)
    docid = StringProperty(unique_index=True,required=True)
    name = StringProperty(unique_index=True,required=True)
    code = StringProperty(unique_index=True,required=True)
    level = IntegerProperty(index=True,required=True)
    parent_id = IntegerProperty(index=True)
    hal_has_subclass = RelationshipTo("HalDomain", "HAS_SUBCLASS", model = SubclassRelationship)
    hal_sameas_dewey = RelationshipTo("DeweyDomain", "SAME_AS", model = SameasRelationship)
    def to_json(self):
        return {
        "id": self.id,
        "meta_id": self.meta_id,
        "docid": self.docid,
        "name": self.name,
        "code": self.code,
        "level": self.level,
        "parent_id": self.parent_id,
        "group": "bso"
      }

hal_all_definition = dict(node_class=HalDomain, direction=EITHER,
                  relation_type=None, model=None)
hal_sub_definition = dict(node_class=HalDomain, direction=OUTGOING,
                  relation_type='HAS_SUBCLASS', model=SubclassRelationship)
hal_sameas_definition = dict(node_class=HalDomain, direction=OUTGOING,
                  relation_type='SAME_AS', model=SameasRelationship)