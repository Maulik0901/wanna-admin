import City from "../../models/city/city.model";
import ApiSuccess from "../../helpers/ApiSuccess";

export default {
  async getCities(req, res, next) {
    try {
      let page = +req.query.page || 1,
        limit = +req.query.limit || 20,
        { createdBy, isActive, search } = req.query;

      let query = { isDeleted: false };
      if (createdBy) {
        query.createdBy = createdBy;
      }
      if (isActive && typeof JSON.parse(isActive) == "boolean") {
        query.isActive = JSON.parse(isActive);
      }

      if (search) {
        let Regx = new RegExp("" + search, "i");
        query.$or = [{ name: { $regex: Regx } }, { arName: { $regex: Regx } }];
      }

      let cities = await City.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const cityCount = await City.count(query);
      const pageCount = Math.ceil(cityCount / limit);

      return res.send(
        new ApiSuccess(true, 200, "city find SuccessFully", {
          cities,
          page,
          pageCount,
          limit,
          cityCount,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  async getAllCity(req, res, next) {
    try {
      let { createdBy, isActive } = req.query;

      let query = { isDeleted: false, isActive: true };

      if (createdBy) {
        query.createdBy = createdBy;
      }

      // if (typeof isActive == "boolean") {
      //   query.isActive = true;
      // }

      let cities = await City.find(query).sort({ createdAt: -1 });

      const cityCount = cities.length;
      const pageCount = 1;

      return res.send(
        new ApiSuccess(true, 200, "city find SuccessFully", {
          cities,
          pageCount,
          cityCount,
        })
      );
    } catch (err) {
      next(err);
    }
  },

  async createCity(req, res, next) {
    try {
      let cityData = {
        name: req.body.name,
        arName: req.body.arName,
        isActive: req.body.isActive,
        createdBy: req.body.createdBy,
      };

      let createdCity = await City.create({ ...cityData });

      return res.send(
        new ApiSuccess(true, 200, "city Created SuccessFully", createdCity)
      );
    } catch (err) {
      next(err);
    }
  },

  async getOneCity(req, res, next) {
    try {
      let { cityId } = req.params;

      let city = await City.findOne({ _id: cityId });

      if (!city) {
        return res.send(new ApiSuccess(false, 400, "city not found", city));
      }

      return res.send(
        new ApiSuccess(true, 200, "city Found SuccessFully", city)
      );
    } catch (err) {
      next(err);
    }
  },

  async editCity(req, res, next) {
    try {
      let { cityId } = req.params;

      let city = await City.findOne({ _id: cityId, isDeleted: false });

      if (!city) {
        return res.send(new ApiSuccess(false, 400, "city not found", city));
      }

      console.log("Body", req.body);
      let updateData = { ...req.body };
      console.log({ updateData });

      await City.updateOne({ _id: cityId }, updateData);

      return res.send(
        new ApiSuccess(true, 200, "city updated SuccessFully", {})
      );
    } catch (err) {
      next(err);
    }
  },

  async deleteCity(req, res, next) {
    try {
      let { cityId } = req.params;

      let city = await City.findOne({ _id: cityId, isDeleted: false });

      if (!city) {
        return res.send(new ApiSuccess(false, 400, "city not found", city));
      }

      await City.updateOne({ _id: cityId }, { isDeleted: true });

      return res.send(
        new ApiSuccess(true, 200, "city deleted SuccessFully", {})
      );
    } catch (err) {
      next(err);
    }
  },
};
