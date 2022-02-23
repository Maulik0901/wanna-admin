import express from 'express';
import CategoryController from '../../controllers/category/category.controller';
import { requireAuth } from '../../services/passport';
import { multerSaveTo } from '../../services/multer-service';

const router = express.Router();

router.route('/')
    .post(
        // requireAuth,
        multerSaveTo('categories').single('img'),
        CategoryController.validateBody(),
        CategoryController.create
    )
    .get(CategoryController.findAll);

router.route('/updateOrder')
      .put(CategoryController.updateCategoryOrder);

router.route('/getall')
      .get(CategoryController.getAllCategory);

router.route('/getCategory')
      .get(CategoryController.getCategory);
      
router.route('/subcategory')
      .post(
        // requireAuth,
        multerSaveTo('categories').single('img'),
        CategoryController.validateBody(),
        CategoryController.createSubCategory
      )
      .get(CategoryController.findsubcategoryAll);

router.route('/:categoryId')
    .put(
        // requireAuth,
        multerSaveTo('categories').single('img'),
        CategoryController.validateBody(true),
        CategoryController.update
    )
    .get(CategoryController.findById)
    .delete(
        // requireAuth,
        CategoryController.delete
    );

router.route('/subcategory/:categoryId')
    .put(
        // requireAuth,
        multerSaveTo('categories').single('img'),
        CategoryController.validateBody(true),
        CategoryController.updateSubCategory
    )    
    .delete(
        // requireAuth,
        CategoryController.delete
    );
    
router.route('/:categoryId/service')
    .put( requireAuth,CategoryController.service)

router.route('/:categoryId/unservice')
    .put( requireAuth,CategoryController.unservice)


export default router;