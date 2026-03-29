from odoo import fields, models


class BakkiRanch(models.Model):
    _name = 'bakki.ranch'
    _description = 'Bakki ranch'
    _order = 'name'

    name = fields.Char(string='Ranch Name', required=True, index=True)
    code = fields.Char(string='Ranch Code', index=True)
    source_file_name = fields.Char(string='Source File Name')
    source_feature_name = fields.Char(string='Source Feature Name')
    boundary_geometry_wkt = fields.Text(
        string='Boundary Geometry WKT',
        help='Legacy geometry scaffold retained while Bakki Core PostGIS owns authoritative geometry.',
    )
    active = fields.Boolean(string='Active', default=True)
